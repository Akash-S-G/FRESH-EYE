
---

# Fresh Eye: Food Spoilage & Nutrition Analysis Platform

**Fresh Eye** is a full-stack IoT-powered web application for food spoilage detection and nutrition label analysis. It integrates a Flask backend, a React frontend, and supports real-time data from ESP32-CAM (for image capture) and NodeMCU/ESP8266 (for DHT sensor data).

---

## Features

- **Food Spoilage Detection:**  
  Upload or capture food images (via webcam or ESP32-CAM) to detect spoilage using a deep learning model.

- **Nutrition Label Scanner:**  
  Upload, capture, or use ESP32-CAM to scan nutrition labels. Extracts nutrition facts and provides health analysis.

- **IoT Integration:**  
  - **ESP32-CAM:** Capture food/label images remotely.
  - **NodeMCU/ESP8266:** Send real-time temperature and humidity data from a DHT sensor.

- **User Dashboard:**  
  View analysis history, profile, and manage email notifications.

---

## Project Structure

```
FRESH-EYE/
  backend/           # Flask backend (API, ML, IoT endpoints)
  src/               # React frontend (UI, pages, components)
  public/            # Static assets (favicon, robots.txt, etc.)
  esp32/             # (Your ESP32-CAM Arduino code)
  esp8266/           # (Your NodeMCU/ESP8266 Arduino code)
```

---

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Variables

Create a `.env` file in the `backend/` directory for API keys and email settings:

```
SERVER_API_KEY=your_gemini_api_key   # Optional, for advanced nutrition extraction
SMTP_SERVER=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_email@example.com
SMTP_PASSWORD=your_email_password
SENDER_EMAIL=your_email@example.com
```

### 3. Start the Backend Server

```bash
python app.py
```

- The backend will run on `http://localhost:5000/`
- Model file: `food_spoilage_multi_class_detector_model.h5` (should be present in `backend/`)

---

## Frontend Setup

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Start the React App

```bash
npm run dev
```

- The frontend will run on `http://localhost:5173/` (or as shown in your terminal)
- Make sure the backend is running for API calls to work.

---

## IoT Device Integration

### ESP32-CAM

- Upload your ESP32-CAM Arduino code (place it in `esp32/`).
- Configure it to POST images to `http://<backend-ip>:5000/predict_from_esp32` or `/latest_esp32_image`.

### NodeMCU/ESP8266 (DHT Sensor)

- Upload your NodeMCU Arduino code (place it in `esp8266/`).
- Configure it to POST sensor data to `http://<backend-ip>:5000/iot_data`.

---

## Main Frontend Pages

- `/` - Home
- `/spoilage-detection` - Food Spoilage Detection (webcam, ESP32, upload)
- `/scan-label` - Nutrition Label Scanner (webcam, ESP32, upload)
- `/dashboard` - User Dashboard
- `/profile` - Profile & Settings
- `/email-settings` - Email Notification Settings

---

## API Endpoints (Backend)

- `POST /predict_from_esp32` - Analyze image (ESP32 or webcam)
- `GET /latest_esp32_image` - Get latest ESP32 image
- `POST /extract_nutrition` - Extract nutrition from OCR text
- `POST /iot_data` - Receive IoT sensor data
- `GET /get_iot_data` - Get latest IoT sensor data

---

## Notes

- For Gemini API features, you need a valid API key and quota.
- If you only want local nutrition extraction, you can run without the Gemini API key.
- The backend will fallback to local extraction if the API quota is exceeded.

---

## Contributing

Pull requests and suggestions are welcome!  
Please open an issue for major changes.

---

## License

MIT License

---
