import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import Tesseract from 'tesseract.js';
import {
  Camera,
  Upload,
  Scan,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Heart,
  Shield,
  Target,
  TrendingUp,
  X,
  RotateCcw,
  PieChart as PieChartIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  serving_size: string;
  ingredients: string[];
  health_score: number;
  warnings: string[];
  benefits: string[];
  additional_nutrients?: Record<string, {
    value: number;
    unit: string;
    daily_value?: number;
  }>;
}

const mockNutritionData: NutritionData = {
  calories: 150,
  protein: 12,
  carbs: 20,
  fat: 3,
  fiber: 8,
  sugar: 4,
  sodium: 480,
  serving_size: "1 cup (240ml)",
  ingredients: [
    "Organic Spinach",
    "Water",
    "Sea Salt",
    "Natural Flavoring",
    "Vitamin C",
    "Iron",
    "Calcium",
  ],
  health_score: 8.7,
  warnings: ["High in sodium"],
  benefits: ["High in iron", "Good source of fiber", "Rich in vitamins"],
};

const NUTRITION_COLORS = {
  protein: '#FF6B6B',
  carbs: '#4ECDC4',
  fat: '#FFD93D',
  fiber: '#95E1D3',
  sugar: '#FF8B94',
  sodium: '#6C5CE7'
};

// Helper: Parse nutrition facts from OCR text
async function parseNutritionFromText(text: string): Promise<NutritionData> {
  // Send to backend for processing
  return fetch('http://localhost:5000/extract_nutrition', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        const n = data.nutrition;
        // Normalize main nutrients to numbers
        return {
          ...n,
          calories: Number(n.calories) || 0,
          protein: Number(n.protein) || 0,
          carbs: Number(n.carbs) || 0,
          fat: Number(n.fat) || 0,
          fiber: Number(n.fiber) || 0,
          sugar: Number(n.sugar) || 0,
          sodium: Number(n.sodium) || 0,
        };
      }
      throw new Error(data.message || 'Failed to parse nutrition data');
    });
}

// Custom label renderer for Pie chart
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent, name, value } = props;
  if (!value || percent === 0) return null; // Hide label for zero values
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#333"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={14}
      fontWeight={500}
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ScanLabel() {
  const [scanMode, setScanMode] = useState<"upload" | "camera" | "esp32">("upload");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<NutritionData | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [videoConstraints, setVideoConstraints] = useState<any>({ facingMode: "environment" });
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [esp32Image, setEsp32Image] = useState<string | null>(null);
  const [esp32ImageLoading, setEsp32ImageLoading] = useState<boolean>(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [apiResult, setApiResult] = useState(null);
  const [ollamaResult, setOllamaResult] = useState(null);
  const [backendResponse, setBackendResponse] = useState(null);

  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        setHasPermission(false);
        setCameraError("Camera access denied. Please enable camera permissions in your browser settings.");
      }
    };
    
    checkCameraPermission();
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await mobilenet.load();
        setModel(loadedModel);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Error loading model:', error);
        setCameraError('Failed to load image analysis model');
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter(
        (device) =>
          device.kind === "videoinput" &&
          device.label &&
          !/iriun|virtual/i.test(device.label)
      );
      if (videoDevices.length > 0) {
        setVideoConstraints({ deviceId: videoDevices[0].deviceId });
      } else {
        setCameraError("No real camera found. Please connect a webcam.");
      }
    });
  }, []);

  const handleCapture = async () => {
    if (!webcamRef.current) return;
    try {
      setIsScanning(true);
      setCameraError(null);
      setProcessingStatus('Capturing image...');
      // Get the current frame from the webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }
      setCapturedImage(imageSrc);
      // Do NOT run OCR or backend analysis here
    } catch (err) {
      console.error('Camera capture error:', err);
      setCameraError('Failed to capture image. Please try again with better lighting and focus.');
    } finally {
      setIsScanning(false);
      setProcessingStatus(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        setUploadedImage(imageSrc);
        // Do NOT run OCR or backend analysis here
      };
      reader.readAsDataURL(file);
    }
  };

  const runOcrAndParse = async (imageSrc: string) => {
    setIsScanning(true);
    setCameraError(null);
    try {
      setScanResult(null);
      setOcrText(null);
      setBackendResponse(null);
      const result = await Tesseract.recognize(imageSrc, 'eng', { 
        logger: m => console.log(m)
      });
      const text = result.data.text;
      setOcrText(text);
      setProcessingStatus('Analyzing nutrition information...');
      const nutrition = await parseNutritionFromText(text);
      setScanResult(nutrition);
      setBackendResponse(nutrition);
    } catch (err) {
      console.error('OCR Error:', err);
      setCameraError('Failed to analyze nutrition label. Please try again with better lighting and focus.');
    } finally {
      setIsScanning(false);
      setProcessingStatus(null);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    setUploadedImage(null);
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 8) return "emerald";
    if (score >= 6) return "amber";
    return "red";
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    return "Poor";
  };

  const handleEmailShare = async () => {
    try {
      setEmailStatus('sending');
      const response = await fetch('http://localhost:5000/send_email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'example@gmail.com',
          nutritionData: scanResult
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setEmailStatus('sent');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch (error) {
      console.error('Email error:', error);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 3000);
    }
  };

  // Fetch ESP32 image from backend
  const fetchEsp32Image = async () => {
    setEsp32ImageLoading(true);
    setCameraError(null);
    try {
      const response = await fetch('http://localhost:5000/latest_esp32_image');
      if (!response.ok) throw new Error('Failed to fetch ESP32 image');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setEsp32Image(reader.result as string);
        setEsp32ImageLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      setCameraError('Could not fetch ESP32 image.');
      setEsp32ImageLoading(false);
    }
  };

  // Analyze ESP32 image
  const handleEsp32Analyze = () => {
    if (esp32Image) {
      runOcrAndParse(esp32Image);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Smart Label Scanner
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Scan nutrition labels instantly with AI-powered OCR technology. Get
          detailed health analysis and personalized recommendations.
        </p>
      </div>

      {!scanResult ? (
        <div className="space-y-8">
          {/* Scan Mode Selection */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scan className="h-5 w-5 mr-2 text-emerald-600" />
                Choose Scanning Method
              </CardTitle>
              <CardDescription>
                Upload an image or use your camera to scan nutrition labels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={scanMode}
                onValueChange={(value) =>
                  setScanMode(value as "upload" | "camera" | "esp32")
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upload" className="flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="flex items-center">
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
                  </TabsTrigger>
                  <TabsTrigger value="esp32" className="flex items-center">
                    <Camera className="h-4 w-4 mr-2" />
                    Use ESP32
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-6">
                  <div className="border-2 border-dashed border-emerald-200 rounded-lg p-8 text-center hover:border-emerald-300 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Upload Nutrition Label
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose an image file of a nutrition label
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-health-gradient"
                    >
                      Choose File
                    </Button>
                  </div>
                  {uploadedImage && (
                    <div className="mb-4 flex flex-col items-center">
                      <h4 className="font-medium text-gray-900 mb-2">Uploaded Image</h4>
                      <div className="relative rounded-lg overflow-hidden border border-gray-200 max-w-xs w-full flex justify-center">
                        <img
                          src={uploadedImage}
                          alt="Uploaded nutrition label"
                          className="object-contain w-full h-auto max-h-80"
                          style={{ maxWidth: '100%', height: 'auto' }}
                        />
                      </div>
                      <Button
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                        onClick={async () => {
                          setIsScanning(true);
                          setCameraError(null);
                          setApiResult(null);
                          setOllamaResult(null);
                          setBackendResponse(null);
                          try {
                            const result = await Tesseract.recognize(uploadedImage, 'eng', { logger: m => console.log(m) });
                            const text = result.data.text;
                            setOcrText(text);
                            setProcessingStatus('Analyzing nutrition information...');
                            const response = await fetch('http://localhost:5000/extract_nutrition', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ text }),
                            });
                            const data = await response.json();
                            setBackendResponse(data);
                            if (data.status === 'success') {
                              if (data.source === 'api' && data.nutrition) {
                                setApiResult(data.nutrition);
                                setScanResult(data.nutrition);
                              } else if (data.source === 'ollama' && data.ollama_result) {
                                setOllamaResult(data.ollama_result);
                                setScanResult(data.ollama_result);
                              } else if (data.raw_response) {
                                setOllamaResult(null);
                                setApiResult(null);
                              }
                            } else {
                              throw new Error(data.message || 'Failed to extract nutrition');
                            }
                          } catch (err) {
                            setCameraError('Failed to analyze nutrition label. Please try again with better lighting and focus.');
                          } finally {
                            setIsScanning(false);
                            setProcessingStatus(null);
                          }
                        }}
                        disabled={isScanning}
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Scan className="h-4 w-4 mr-2" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="camera" className="mt-6">
                  <div className="flex flex-col items-center">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      className="w-full max-w-md object-cover rounded-lg border border-gray-200"
                      videoConstraints={videoConstraints}
                      onUserMediaError={() => setCameraError('Unable to access camera. Please check permissions.')}
                    />
                    <Button
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                      onClick={handleCapture}
                      disabled={isScanning}
                    >
                      Capture
                    </Button>
                    {capturedImage && (
                      <div className="mt-4 flex flex-col items-center">
                        <img
                          src={capturedImage}
                          alt="Captured nutrition label"
                          className="object-contain w-full h-auto max-h-80 border rounded"
                          style={{ maxWidth: '100%', height: 'auto' }}
                        />
                        <Button
                          className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => runOcrAndParse(capturedImage)}
                          disabled={isScanning}
                        >
                          {isScanning ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Scan className="h-4 w-4 mr-2" />
                              Analyze
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {cameraError && (
                      <Alert className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{cameraError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="esp32" className="mt-6">
                  <div className="flex flex-col items-center">
                    <img
                      src={`http://localhost:5000/latest_esp32_image?t=${Date.now()}`}
                      alt="ESP32 Live Feed"
                      className="w-full max-w-md object-contain rounded-lg border border-gray-200"
                      style={{ maxHeight: '60vh', width: 'auto', maxWidth: '100%' }}
                    />
                    <Button
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                      onClick={async () => {
                        // Fetch the current image from ESP32
                        const response = await fetch('http://localhost:5000/latest_esp32_image');
                        if (!response.ok) {
                          setCameraError('Failed to fetch ESP32 image.');
                          return;
                        }
                        const blob = await response.blob();
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEsp32Image(reader.result as string);
                        };
                        reader.readAsDataURL(blob);
                      }}
                      disabled={isScanning}
                    >
                      Capture
                    </Button>
                    {esp32Image && (
                      <div className="mt-4 flex flex-col items-center">
                        <img
                          src={esp32Image}
                          alt="ESP32 nutrition label"
                          className="object-contain w-full h-auto max-h-80 border rounded"
                          style={{ maxWidth: '100%', height: 'auto' }}
                        />
                        <Button
                          className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => runOcrAndParse(esp32Image)}
                          disabled={isScanning}
                        >
                          {isScanning ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Scan className="h-4 w-4 mr-2" />
                              Analyze
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {cameraError && (
                      <Alert className="mt-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{cameraError}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-emerald-900 mb-2">
                    Tips for Better Results
                  </h3>
                  <ul className="text-sm text-emerald-700 space-y-1">
                    <li>• Ensure good lighting when capturing images</li>
                    <li>• Keep the nutrition label flat and in focus</li>
                    <li>• Include the entire nutrition facts panel</li>
                    <li>• Avoid shadows and reflections on the label</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Loading Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {processingStatus || 'Scanning Nutrition Label...'}
            </h3>
            <p className="text-gray-600">
              Please hold the camera steady and ensure good lighting
            </p><br />
            <p className="text-gray-600">Extracting nutrition information...</p>
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanResult && (
        <div className="space-y-8 opacity-100">
          {/* Captured Image Display */}
          {capturedImage && (
            <div className="mb-4 flex flex-col items-center">
              <h4 className="font-medium text-gray-900 mb-2">Captured Image (Laptop Camera)</h4>
              <div className="relative rounded-lg overflow-hidden border border-gray-200 max-w-xs w-full flex justify-center">
                <img
                  src={capturedImage}
                  alt="Captured nutrition label"
                  className="object-contain w-full h-auto max-h-80"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                onClick={async () => {
                  setIsScanning(true);
                  setCameraError(null);
                  setApiResult(null);
                  setOllamaResult(null);
                  setBackendResponse(null);
                  try {
                    // Assume imageSrc is the image to analyze (captured/uploaded/esp32)
                    // Run OCR to get text
                    const result = await Tesseract.recognize(capturedImage, 'eng', { logger: m => console.log(m) });
                    const text = result.data.text;
                    setOcrText(text);
                    setProcessingStatus('Analyzing nutrition information...');
                    // Send to backend for nutrition extraction (API first, fallback to Ollama)
                    const response = await fetch('http://localhost:5000/extract_nutrition', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text }),
                    });
                    const data = await response.json();
                    setBackendResponse(data);
                    if (data.status === 'success') {
                      if (data.source === 'api' && data.nutrition) {
                        setApiResult(data.nutrition);
                        setScanResult(data.nutrition);
                      } else if (data.source === 'ollama' && data.ollama_result) {
                        setOllamaResult(data.ollama_result);
                        setScanResult(data.ollama_result);
                      } else if (data.raw_response) {
                        setOllamaResult(null);
                        setApiResult(null);
                      }
                    } else {
                      throw new Error(data.message || 'Failed to extract nutrition');
                    }
                  } catch (err) {
                    setCameraError('Failed to analyze nutrition label. Please try again with better lighting and focus.');
                  } finally {
                    setIsScanning(false);
                    setProcessingStatus(null);
                  }
                }}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          )}
          {esp32Image && (
            <div className="mb-4 flex flex-col items-center">
              <h4 className="font-medium text-gray-900 mb-2">ESP32 Captured Image</h4>
              <div className="relative rounded-lg overflow-hidden border border-gray-200 max-w-xs w-full flex justify-center">
                <img
                  src={esp32Image}
                  alt="ESP32 nutrition label"
                  className="object-contain w-full h-auto max-h-80"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                onClick={async () => {
                  setIsScanning(true);
                  setCameraError(null);
                  setApiResult(null);
                  setOllamaResult(null);
                  setBackendResponse(null);
                  try {
                    // Assume imageSrc is the image to analyze (captured/uploaded/esp32)
                    // Run OCR to get text
                    const result = await Tesseract.recognize(esp32Image, 'eng', { logger: m => console.log(m) });
                    const text = result.data.text;
                    setOcrText(text);
                    setProcessingStatus('Analyzing nutrition information...');
                    // Send to backend for nutrition extraction (API first, fallback to Ollama)
                    const response = await fetch('http://localhost:5000/extract_nutrition', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text }),
                    });
                    const data = await response.json();
                    setBackendResponse(data);
                    if (data.status === 'success') {
                      if (data.source === 'api' && data.nutrition) {
                        setApiResult(data.nutrition);
                        setScanResult(data.nutrition);
                      } else if (data.source === 'ollama' && data.ollama_result) {
                        setOllamaResult(data.ollama_result);
                        setScanResult(data.ollama_result);
                      } else if (data.raw_response) {
                        setOllamaResult(null);
                        setApiResult(null);
                      }
                    } else {
                      throw new Error(data.message || 'Failed to extract nutrition');
                    }
                  } catch (err) {
                    setCameraError('Failed to analyze nutrition label. Please try again with better lighting and focus.');
                  } finally {
                    setIsScanning(false);
                    setProcessingStatus(null);
                  }
                }}
                disabled={isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          )}
          {/* OCR Text Debug */}
          {ocrText && (
            <div className="mb-4 p-2 bg-gray-100 rounded">
              <h4 className="font-medium text-gray-900 mb-1">OCR Text</h4>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">{ocrText}</pre>
            </div>
          )}
          {/* Ollama Result */}
          {!apiResult && ollamaResult && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg text-emerald-700 font-bold">
                  Nutrition Analysis (Ollama)
                </div>
                <div className="text-sm text-gray-600">Calories: {ollamaResult.calories ?? 'N/A'}</div>
                <div className="text-sm text-gray-600">Protein: {ollamaResult.protein ?? 'N/A'}g</div>
                <div className="text-sm text-gray-600">Carbs: {ollamaResult.carbs ?? 'N/A'}g</div>
                <div className="text-sm text-gray-600">Fat: {ollamaResult.fat ?? 'N/A'}g</div>
                <div className="text-sm text-gray-600">Fiber: {ollamaResult.fiber ?? 'N/A'}g</div>
                <div className="text-sm text-gray-600">Sugar: {ollamaResult.sugar ?? 'N/A'}g</div>
                <div className="text-sm text-gray-600">Sodium: {ollamaResult.sodium ?? 'N/A'}mg</div>
                <div className="text-sm text-gray-600">Serving Size: {ollamaResult.serving_size ?? 'N/A'}</div>
                {ollamaResult.ingredients && (
                  <div className="text-sm text-gray-600 mt-2">
                    <b>Ingredients:</b> {Array.isArray(ollamaResult.ingredients) ? ollamaResult.ingredients.join(', ') : ollamaResult.ingredients}
                  </div>
                )}
                {typeof ollamaResult.health_score === 'number' ? (
                  <div className="text-sm text-gray-600 mt-2">
                    <b>Health Score:</b> {ollamaResult.health_score}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 mt-2">
                    <b>Health Score:</b> N/A
                  </div>
                )}
                {ollamaResult.warnings && ollamaResult.warnings.length > 0 && (
                  <div className="text-sm text-red-600 mt-2">
                    <b>Warnings:</b> {Array.isArray(ollamaResult.warnings) ? ollamaResult.warnings.join(', ') : ollamaResult.warnings}
                  </div>
                )}
                {ollamaResult.benefits && ollamaResult.benefits.length > 0 && (
                  <div className="text-sm text-green-600 mt-2">
                    <b>Benefits:</b> {Array.isArray(ollamaResult.benefits) ? ollamaResult.benefits.join(', ') : ollamaResult.benefits}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* If backend returns a raw_response, show it for debugging: */}
          {!apiResult && !ollamaResult && backendResponse && backendResponse.raw_response && (
            <div className="bg-yellow-100 text-yellow-800 p-2 mt-4 rounded">
              <b>Raw Response:</b>
              <pre className="text-xs whitespace-pre-wrap">{backendResponse.raw_response}</pre>
              <div className="text-xs text-red-600">Warning: No valid prediction available. Please check the prompt or try again.</div>
            </div>
          )}
          {/* Health Score Overview */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Nutrition Analysis Complete
                  </h2>
                  <p className="text-gray-600">
                    Based on your scanned nutrition label
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={resetScan}
                  className="flex items-center"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Scan Another
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-${getHealthScoreColor(scanResult.health_score)}-100 mb-4`}
                  >
                    <div className="text-center">
                      <span
                        className={`text-2xl font-bold text-${getHealthScoreColor(scanResult.health_score)}-600 block`}
                      >
                        {scanResult.health_score?.toFixed(1) || '0.0'}
                      </span>
                      <span className={`text-xs text-${getHealthScoreColor(scanResult.health_score)}-600 block`}>
                        out of 10
                      </span>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900">Health Score</h3>
                  <p
                    className={`text-sm text-${getHealthScoreColor(scanResult.health_score)}-600`}
                  >
                    {getHealthScoreLabel(scanResult.health_score)}
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                    <div className="text-center">
                      <Zap className="h-8 w-8 text-blue-600 mx-auto mb-1" />
                      <span className="text-2xl font-bold text-blue-600 block">
                        {scanResult.calories || 0}
                      </span>
                      <span className="text-xs text-blue-600 block">
                        calories
                      </span>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900">Calories</h3>
                  <p className="text-sm text-gray-600">
                    per serving
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-4 p-2">
                    <div className="text-center">
                      <Heart className="h-8 w-8 text-purple-600 mx-auto mb-1" />
                      <span className="text-sm text-purple-600 block">
                        Serving Size
                      </span>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900">Serving Size</h3>
                  <p className="text-sm text-gray-600">
                    {scanResult.serving_size || 'Not specified'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Breakdown */}
          <div className="space-y-6">
            {/* Nutrition Distribution Chart */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-emerald-600" />
                  NUTRITION DISTRIBUTION
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Protein', value: Number(scanResult.protein) || 0 },
                          { name: 'Carbs', value: Number(scanResult.carbs) || 0 },
                          { name: 'Fat', value: Number(scanResult.fat) || 0 },
                          { name: 'Fiber', value: Number(scanResult.fiber) || 0 },
                          { name: 'Sugar', value: Number(scanResult.sugar) || 0 },
                          { name: 'Sodium', value: Number(scanResult.sodium) ? Number(scanResult.sodium) / 1000 : 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={renderCustomizedLabel}
                      >
                        {Object.entries(NUTRITION_COLORS).map(([key, color]) => (
                          <Cell key={key} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}g`, 'Amount']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Nutrition Values */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-emerald-600" />
                  NUTRITION VALUES
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Nutrients */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Protein</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.protein || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.protein || 0) / 50) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Carbohydrates</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.carbs || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.carbs || 0) / 300) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Fat</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.fat || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.fat || 0) / 70) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Fiber</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.fiber || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.fiber || 0) / 25) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sugar</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.sugar || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.sugar || 0) / 50) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sodium</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.sodium || 0}mg
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.sodium || 0) / 2300) * 100}
                    className="h-2"
                  />
                </div>

                {/* Additional Nutrients */}
                {scanResult.additional_nutrients && Object.entries(scanResult.additional_nutrients).map(([name, data]: [string, any]) => (
                  <div key={name} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{name.replace(/_/g, ' ')}</span>
                      <span className="text-sm text-gray-600">
                        {data.value || 0}{data.unit}
                        {data.daily_value && ` (${data.daily_value}% DV)`}
                      </span>
                    </div>
                    {data.daily_value && (
                      <Progress
                        value={data.daily_value}
                        className="h-2"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Health Insights */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-emerald-600" />
                Health Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Benefits */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                  Health Benefits
                </h4>
                <div className="space-y-2">
                  {scanResult.benefits && scanResult.benefits.length > 0 ? (
                    scanResult.benefits.map((benefit, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        {benefit}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No significant health benefits detected</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Warnings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
                  Considerations
                </h4>
                <div className="space-y-2">
                  {scanResult.warnings && scanResult.warnings.length > 0 ? (
                    scanResult.warnings.map((warning, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        {warning}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No significant health concerns detected</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Ingredients Preview */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Key Ingredients
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {scanResult.ingredients && scanResult.ingredients.length > 0 ? (
                    <>
                      {scanResult.ingredients.slice(0, 4).join(", ")}
                      {scanResult.ingredients.length > 4 && "..."}
                    </>
                  ) : (
                    "No ingredients detected"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-health-gradient">
              <Shield className="h-5 w-5 mr-2" />
              Save to Health Profile
            </Button>
            <Button variant="outline" size="lg">
              <TrendingUp className="h-5 w-5 mr-2" />
              View Detailed Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
