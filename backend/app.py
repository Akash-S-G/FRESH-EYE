import os
from flask import Flask, request, jsonify, send_file
import tensorflow as tf
from tensorflow.keras.preprocessing import image
import numpy as np
import json
from PIL import Image
import io
from nutrition_extraction import extract_nutrition
from dotenv import load_dotenv
import requests
from flask_cors import CORS

# Load environment variables from .env
load_dotenv()
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY if GEMINI_API_KEY else None

app = Flask(__name__)
CORS(app, resources={r"/*":{"origins":["http://localhost:5173"]}})

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

def predict_with_gemini(image_bytes):
    if not GEMINI_API_KEY or not GEMINI_API_URL:
        return None
    try:
        import base64
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
        response = requests.post(GEMINI_API_URL, json=payload)
        if response.status_code == 200:
            try:
                # Try to extract the JSON from the Gemini response
                import re, json as pyjson
                text = response.json()['candidates'][0]['content']['parts'][0]['text']
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    gemini_result = pyjson.loads(match.group(0))
                    return gemini_result
            except Exception as e:
                print(f"Error parsing Gemini response: {e}")
        else:
            print(f"Gemini API error: {response.status_code} {response.text}")
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
    return None

@app.route('/')
def index():
    return jsonify({"status": "ok", "message": "Food Spoilage Detection Backend"})

@app.route('/predict_from_esp32', methods=['POST'])
def predict_from_esp32():
    if 'image' not in request.files:
        return jsonify({"status": "error", "message": "No image file provided"}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No selected file"}), 400
    if file:
        image_bytes = file.read()
        # Save the latest image for frontend display
        with open(LATEST_IMAGE_PATH, 'wb') as f:
            f.write(image_bytes)
        # Try Gemini API first
        gemini_result = predict_with_gemini(image_bytes)
        if gemini_result and 'predictedClass' in gemini_result and 'confidence' in gemini_result:
            response_data = {
                "status": "success",
                "foodItemName": gemini_result.get('foodItemName', 'Unknown'),
                "predictedClass": gemini_result['predictedClass'],
                "confidence": float(gemini_result['confidence']) * 100,
                "source": "gemini"
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
    else:
        return jsonify({"status": "error", "message": "Invalid image format"}), 400

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

        # Try Gemini API first
        gemini_result = predict_with_gemini(image_bytes)
        if gemini_result and 'predictedClass' in gemini_result and 'confidence' in gemini_result:
            response_data = {
                "status": "success",
                "foodItemName": gemini_result.get('foodItemName', 'Unknown'),
                "predictedClass": gemini_result['predictedClass'],
                "confidence": float(gemini_result['confidence']) * 100,
                "source": "gemini"
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

@app.route('/extract_nutrition', methods=['POST'])
def extract_nutrition_api():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'status': 'error', 'message': 'No text provided'}), 400
    text = data['text']
    nutrition = extract_nutrition(text)
    return jsonify({'status': 'success', 'nutrition': nutrition})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 