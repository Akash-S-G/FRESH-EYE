import os
from flask import Flask, request, jsonify, send_file
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
import json
from PIL import Image
import io
from nutrition_extraction import extract_full_nutrition
from dotenv import load_dotenv
import requests
from flask_cors import CORS
from serial_reader import SerialReader, ARDUINO_CONFIG
import base64
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from collections import defaultdict
import logging

# Load environment variables from .env
load_dotenv()
SERVER_API_KEY = os.getenv('SERVER_API_KEY')
SERVER_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + SERVER_API_KEY if SERVER_API_KEY else None
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
SENDER_EMAIL = os.getenv('SENDER_EMAIL')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize serial reader as a global singleton
serial_reader = None

LATEST_IOT_DATA = {
    'temperature': 0.0,
    'humidity': 0.0,
    'lastUpdate': 'Never',
    'connected': False
}

DAILY_NUTRITION_LOG = []  # List of dicts: {email, nutrition, timestamp}
DAILY_IOT_LOG = []        # List of dicts: {email, iot_data, timestamp}

def get_serial_reader():
    return SerialReader()

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

IMG_HEIGHT, IMG_WIDTH = 128, 128
model = None
idx_to_class = {}
class_indices = {}

LATEST_IMAGE_PATH = 'latest_esp32.jpg'

# --- Model and Class Loading Function ---
def load_ml_assets():
    global model, idx_to_class, class_indices
    MODEL_PATH = 'food_spoilage_multi_class_detector_model.h5'
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"Model loaded successfully from {MODEL_PATH}")
    except Exception as e:
        print(f"Error loading model: {e}. Ensure '{MODEL_PATH}' exists.")
        model = None
    CLASSES_JSON_PATH = 'dataset_classes.json'
    if os.path.exists(CLASSES_JSON_PATH):
        try:
            with open(CLASSES_JSON_PATH, 'r') as f:
                classes_data = json.load(f)
                all_class_names = classes_data.get('classes', [])
                class_indices = {label: i for i, label in enumerate(all_class_names)}
                idx_to_class = {i: label for i, label in enumerate(all_class_names)}
            print(f"Class mappings loaded from {CLASSES_JSON_PATH}")
        except Exception as e:
            print(f"Error loading class mappings from JSON: {e}.")
    else:
        print(f"Warning: {CLASSES_JSON_PATH} not found. Using fallback class names.")
        all_class_names = [
            "freshapples", "freshbanana", "freshbittergroud", "freshcapsicum",
            "freshcucumber", "freshokra", "freshoranges", "freshpotato", "freshtomato",
            "rottenapples", "rottenbanana", "rottenbittergroud", "rottencapsicum",
            "rottencucumber", "rottenokra", "rottenoranges", "rottenpatato", "rottentamto"
        ]
        class_indices = {label: i for i, label in enumerate(all_class_names)}
        idx_to_class = {i: label for i, label in enumerate(all_class_names)}

with app.app_context():
    load_ml_assets()

# Initialize serial reader when app starts
get_serial_reader()

def predict_image_from_bytes(image_bytes):
    if model is None:
        return "Model Not Loaded", 0.0, "error"
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.resize((IMG_WIDTH, IMG_HEIGHT))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array /= 255.0
        predictions = model.predict(img_array)[0]
        predicted_class_idx = np.argmax(predictions)
        predicted_label_raw = idx_to_class.get(predicted_class_idx, "Unknown")
        confidence = predictions[predicted_class_idx]
        spoilage_status = "Spoiled" if "rotten" in predicted_label_raw.lower() else "Fresh"
        return predicted_label_raw, float(confidence), spoilage_status
    except Exception as e:
        print(f"Error during image prediction: {e}")
        return "Prediction Error", 0.0, "error"

def predict_with_server(image_bytes):
    if not SERVER_API_KEY or not SERVER_API_URL:
        return None
    try:
        img_b64 = base64.b64encode(image_bytes).decode('utf-8')
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": "Classify the food item in this image as fresh or spoiled. Also, identify the specific food item. Respond with a JSON object: {foodItemName: <name of food item>, predictedClass: <fresh/spoiled>, confidence: <confidence as a float between 0 and 1>}"},
                        {"inlineData": {"mimeType": "image/jpeg", "data": img_b64}}
                    ]
                }
            ]
        }
        response = requests.post(SERVER_API_URL, json=payload)
        if response.status_code == 200:
            try:
                # Try to extract the JSON from the server response
                import re, json as pyjson
                text = response.json()['candidates'][0]['content']['parts'][0]['text']
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    server_result = pyjson.loads(match.group(0))
                    return server_result
            except Exception as e:
                print(f"Error parsing server response: {e}")
        else:
            print(f"Server API error: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error calling server API: {e}")
    return None

@app.route('/')
def index():
    return jsonify({"status": "ok", "message": "Food Spoilage Detection Backend"})

@app.route('/predict_from_esp32', methods=['POST'])
def predict_from_esp32():
    if 'image' not in request.files:
        return jsonify({'status': 'error', 'message': 'No image uploaded'}), 400
    image_file = request.files['image']
    image_bytes = image_file.read()
    # Try API first
    try:
        api_result = predict_with_server(image_bytes)
        if api_result and 'predictedClass' in api_result and 'confidence' in api_result:
            logging.info(f"API spoilage response: {api_result}")
            return jsonify({
                "status": "success",
                "api_result": api_result,
                "source": "api"
            })
    except Exception as e:
        logging.error(f"API spoilage error: {e}")
    # Fallback to Ollama
    image_b64 = base64.b64encode(image_bytes).decode('utf-8')
    prompt = f"""
You are a food spoilage detection expert. Given the following image (base64-encoded JPEG), analyze the food item and return a JSON object with keys: predictedClass, confidence (0-100), spoilage_status (fresh/good/warning/spoiled), foodItemName, and a short explanation. All values must be valid JSON types.

Image (base64):
{image_b64}
"""
    try:
        ollama_response = call_ollama(prompt)
        logging.info(f"Ollama spoilage response: {ollama_response}")
        try:
            result = json.loads(ollama_response)
            return jsonify({
                "status": "success",
                "ollama_result": result,
                "source": "ollama",
                "api_result": None
            })
        except Exception as e:
            logging.error(f"Failed to parse Ollama spoilage JSON: {e}")
            return jsonify({
                "status": "success",
                "ollama_result": None,
                "raw_response": ollama_response,
                "source": "ollama",
                "api_result": None
            })
    except Exception as e:
        logging.error(f"Ollama spoilage error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/latest_esp32_image')
def latest_esp32_image():
    try:
        return send_file(LATEST_IMAGE_PATH, mimetype='image/jpeg')
    except Exception as e:
        return jsonify({'status': 'error', 'message': 'No image available'}), 404

@app.route('/get_latest_prediction_result', methods=['GET'])
def get_latest_prediction_result():
    if not os.path.exists(LATEST_IMAGE_PATH):
        return jsonify({"status": "error", "message": "No image has been received from ESP32 yet."}), 404

    try:
        with open(LATEST_IMAGE_PATH, 'rb') as f:
            image_bytes = f.read()

        # Try server API first
        server_result = predict_with_server(image_bytes)
        if server_result and 'predictedClass' in server_result and 'confidence' in server_result:
            response_data = {
                "status": "success",
                "foodItemName": server_result.get('foodItemName', 'Unknown'),
                "predictedClass": server_result['predictedClass'],
                "confidence": float(server_result['confidence']) * 100,
                "source": "server"
            }
            return jsonify(response_data)

        # Fallback to local model
        raw_prediction, confidence, spoilage_status = predict_image_from_bytes(image_bytes)
        response_data = {
            "status": "success",
            "predictedClass": raw_prediction,
            "confidence": float(confidence) * 100,
            "spoilage_status": spoilage_status,
            "source": "local"
        }
        return jsonify(response_data)

    except Exception as e:
        print(f"Error processing latest image for prediction: {e}")
        return jsonify({"status": "error", "message": f"Failed to get latest prediction: {str(e)}"}), 500

def analyze_nutrition_with_server(text):
    if not SERVER_API_KEY or not SERVER_API_URL:
        return None
    try:
        prompt = """Analyze this nutrition label text and extract ALL nutrition values present in the label. Return the data in this JSON format:
        {
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number,
            "fiber": number,
            "sugar": number,
            "sodium": number,
            "serving_size": string,
            "ingredients": string[],
            "health_score": number (0-10),
            "benefits": string[],
            "warnings": string[],
            "additional_nutrients": {
                "nutrient_name": {
                    "value": number,
                    "unit": string,
                    "daily_value": number (if available)
                }
            }
        }
        Rules:
        1. Extract ALL nutrition values present in the label, not just the main ones
        2. Include any vitamins, minerals, or other nutrients listed
        3. For each nutrient, include its value, unit, and daily value percentage if available
        4. Calculate health_score based on:
           - High protein and fiber are good
           - High sugar, sodium, and fat are bad
           - Consider serving size in calculations
        5. List benefits and warnings based on the nutritional values
        Text to analyze: """
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt + text}
                    ]
                }
            ]
        }
        response = requests.post(SERVER_API_URL, json=payload)
        if response.status_code == 200:
            try:
                text = response.json()['candidates'][0]['content']['parts'][0]['text']
                import re, json as pyjson
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    return pyjson.loads(match.group(0))
            except Exception as e:
                print(f"Error parsing server nutrition response: {e}")
        else:
            print(f"Server API error: {response.status_code} {response.text}")
            # Fallback to local extraction on any error
            return None
    except Exception as e:
        print(f"Error calling server API for nutrition: {e}")
    return None

@app.route('/extract_nutrition', methods=['POST'])
def extract_nutrition():
    data = request.get_json()
    text = data.get('text', '')
    # Prompt for API
    try:
        api_result = analyze_nutrition_with_server(text)
        if api_result:
            logging.info(f"API nutrition response: {api_result}")
            return jsonify({
                "status": "success",
                "nutrition": api_result,
                "source": "api"
            })
    except Exception as e:
        logging.error(f"API nutrition error: {e}")
    # Fallback to Ollama
    prompt = f"""
Extract the nutrition facts from the following label text. Return the result as a JSON object with keys: calories, protein, carbs, fat, fiber, sugar, sodium, serving_size, ingredients (as a list), health_score (as a number between 0 and 10), warnings (as a list), benefits (as a list). All values must be valid JSON types. health_score must be a number.

Label text:
{text}
"""
    try:
        ollama_response = call_ollama(prompt)
        logging.info(f"Ollama nutrition response: {ollama_response}")
        try:
            nutrition = json.loads(ollama_response)
            return jsonify({
                "status": "success",
                "nutrition": nutrition,
                "source": "ollama",
                "api_result": None,
                "ollama_result": nutrition
            })
        except Exception as e:
            logging.error(f"Failed to parse Ollama nutrition JSON: {e}")
            return jsonify({
                "status": "success",
                "nutrition": None,
                "raw_response": ollama_response,
                "source": "ollama",
                "api_result": None,
                "ollama_result": None
            })
    except Exception as e:
        logging.error(f"Ollama nutrition error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/get_iot_data')
def get_iot_data():
    try:
        return jsonify(LATEST_IOT_DATA)
    except Exception as e:
        return jsonify({
            'temperature': 0.0,
            'humidity': 0.0,
            'lastUpdate': 'Never',
            'connected': False
        })

@app.route('/set_port', methods=['POST'])
def set_port():
    try:
        data = request.get_json()
        new_port = data.get('port')
        if not new_port:
            return jsonify({'error': 'No port specified'}), 400
            
        reader = get_serial_reader()
        reader.set_port(new_port)
        return jsonify({
            'message': 'Port updated successfully',
            'current_config': ARDUINO_CONFIG
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/send_email', methods=['POST'])
def send_email():
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'nutritionData' not in data:
            return jsonify({'status': 'error', 'message': 'Missing required data'}), 400

        recipient_email = data['email']
        nutrition_data = data['nutritionData']

        # Create email message
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = recipient_email
        msg['Subject'] = 'Your Nutrition Analysis Results'

        # Create HTML content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2e7d32;">Nutrition Analysis Results</h2>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1b5e20;">Health Score: {nutrition_data.get('health_score', 'N/A')}/10</h3>
                
                <h4>Main Nutrients:</h4>
                <ul>
                    <li>Calories: {nutrition_data.get('calories', 'N/A')}</li>
                    <li>Protein: {nutrition_data.get('protein', 'N/A')}g</li>
                    <li>Carbohydrates: {nutrition_data.get('carbs', 'N/A')}g</li>
                    <li>Fat: {nutrition_data.get('fat', 'N/A')}g</li>
                    <li>Fiber: {nutrition_data.get('fiber', 'N/A')}g</li>
                    <li>Sugar: {nutrition_data.get('sugar', 'N/A')}g</li>
                    <li>Sodium: {nutrition_data.get('sodium', 'N/A')}mg</li>
                </ul>

                <h4>Serving Size:</h4>
                <p>{nutrition_data.get('serving_size', 'N/A')}</p>

                <h4>Health Benefits:</h4>
                <ul>
                    {''.join(f'<li>{benefit}</li>' for benefit in nutrition_data.get('benefits', []))}
                </ul>

                <h4>Warnings:</h4>
                <ul>
                    {''.join(f'<li>{warning}</li>' for warning in nutrition_data.get('warnings', []))}
                </ul>
            </div>

            <p style="color: #666; font-size: 0.9em;">
                This analysis was performed using Fresh Eye's advanced nutrition analysis system.
            </p>
        </body>
        </html>
        """

        msg.attach(MIMEText(html_content, 'html'))

        # Connect to SMTP server and send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        return jsonify({'status': 'success', 'message': 'Email sent successfully'})

    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/iot_data', methods=['POST'])
def iot_data():
    global LATEST_IOT_DATA
    data = request.get_json()
    print("Received IoT data:", data)
    LATEST_IOT_DATA = {
        'temperature': float(data.get('temperature', 0)),
        'humidity': float(data.get('humidity', 0)),
        'lastUpdate': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'connected': True
    }
    recipient_email = data.get('email')
    if recipient_email:
        DAILY_IOT_LOG.append({
            'email': recipient_email,
            'iot_data': LATEST_IOT_DATA.copy(),
            'timestamp': datetime.now().isoformat()
        })
    return jsonify({"status": "success"})

def send_custom_email(subject, html_content, recipient_email):
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.attach(MIMEText(html_content, 'html'))
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)

# --- Scheduled Jobs: Send daily reports to each user ---
def send_daily_nutrition_report():
    user_logs = defaultdict(list)
    for entry in DAILY_NUTRITION_LOG:
        user_logs[entry['email']].append(entry)
    for email, entries in user_logs.items():
        html_content = f"<h2>Your Daily Nutrition Report</h2><ul>"
        for e in entries:
            html_content += f"<li>{e['nutrition']}</li>"
        html_content += "</ul>"
        send_custom_email("Daily Nutrition Analysis Report", html_content, email)
    DAILY_NUTRITION_LOG.clear()

def send_iot_report(time_of_day):
    user_logs = defaultdict(list)
    for entry in DAILY_IOT_LOG:
        user_logs[entry['email']].append(entry)
    for email, entries in user_logs.items():
        latest = entries[-1]['iot_data'] if entries else {}
        html_content = f"<h2>IoT Report ({time_of_day})</h2>"
        html_content += f"<p>Temperature: {latest.get('temperature', 'N/A')}°C<br>Humidity: {latest.get('humidity', 'N/A')}%</p>"
        send_custom_email(f"IoT Report ({time_of_day})", html_content, email)
    # Optionally clear log after evening report
    if time_of_day == 'Evening':
        DAILY_IOT_LOG.clear()

scheduler = BackgroundScheduler()
scheduler.add_job(send_daily_nutrition_report, 'cron', hour=20, minute=0)  # 8 PM
scheduler.add_job(lambda: send_iot_report('Morning'), 'cron', hour=8, minute=0)  # 8 AM
scheduler.add_job(lambda: send_iot_report('Evening'), 'cron', hour=20, minute=0)  # 8 PM
scheduler.start()

# --- Ollama Integration: Text-based prediction using local model (mistral) ---
@app.route('/predict_with_ollama', methods=['POST'])
def predict_with_ollama():
    data = request.get_json()
    prompt = data.get('prompt')
    model = data.get('model', 'mistral')
    if not prompt:
        return jsonify({'status': 'error', 'message': 'No prompt provided'}), 400
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            }
        )
        if response.status_code == 200:
            result = response.json()
            return jsonify({'status': 'success', 'response': result.get('response', '')})
        else:
            return jsonify({'status': 'error', 'message': f'Ollama API error: {response.status_code} {response.text}'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Error calling Ollama: {e}'}), 500

# --- NodeMCU DHT Sensor Endpoint ---
LATEST_NODEMCU_DHT = {
    'temperature': 0.0,
    'humidity': 0.0,
    'lastUpdate': 'Never',
    'email': None
}

@app.route('/nodemcu_dht', methods=['POST'])
def nodemcu_dht():
    global LATEST_NODEMCU_DHT
    data = request.get_json()
    print("Received NodeMCU DHT data:", data)
    LATEST_NODEMCU_DHT = {
        'temperature': float(data.get('temperature', 0)),
        'humidity': float(data.get('humidity', 0)),
        'lastUpdate': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'email': data.get('email')
    }
    # Log for daily report if email provided
    recipient_email = data.get('email')
    if recipient_email:
        DAILY_IOT_LOG.append({
            'email': recipient_email,
            'iot_data': LATEST_NODEMCU_DHT.copy(),
            'timestamp': datetime.now().isoformat()
        })
    return jsonify({"status": "success"})

@app.route('/get_latest_nodemcu_dht', methods=['GET'])
def get_latest_nodemcu_dht():
    return jsonify(LATEST_NODEMCU_DHT)

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "mistral"

# Helper to call Ollama with a prompt

def call_ollama(prompt):
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    response = requests.post(OLLAMA_URL, json=payload)
    response.raise_for_status()
    return response.json()["response"]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False) 