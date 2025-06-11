import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {
  Camera,
  Upload,
  Scan,
  AlertTriangle,
  CheckCircle,
  X,
  RotateCcw,
  Thermometer,
  Droplets,
  Clock,
  Zap,
  Eye,
  Target,
  Wifi,
  WifiOff,
  Play,
  Pause,
  Settings,
  Info,
  Heart,
  Shield,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SpoilageResult {
  freshness: number; // 0-100 score
  status: "fresh" | "good" | "warning" | "spoiled";
  confidence: number;
  indicators: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
  }>;
  recommendations: string[];
  estimatedShelfLife: string;
  detectedIssues: string[];
  predictedClass?: string;
}

interface IoTSensorData {
  temperature: number;
  humidity: number;
  lastUpdate: string;
  connected: boolean;
}

const mockSpoilageResult: SpoilageResult = {
  freshness: 75,
  status: "good",
  confidence: 92,
  indicators: [
    {
      type: "Color Change",
      severity: "low",
      description: "Slight browning detected on edges",
    },
    {
      type: "Texture",
      severity: "medium",
      description: "Surface appears slightly soft",
    },
  ],
  recommendations: [
    "Consume within 2-3 days",
    "Store in refrigerator",
    "Check for any unusual odors before consumption",
  ],
  estimatedShelfLife: "2-3 days",
  detectedIssues: [],
};

const mockIoTData: IoTSensorData = {
  temperature: 4.2,
  humidity: 65,
  lastUpdate: "2 minutes ago",
  connected: true,
};

const CAMERA_OPTIONS = [
  { label: 'Laptop Camera', value: 'laptop' },
  { label: 'ESP32 Camera', value: 'esp32' },
];

export default function SpoilageDetection() {
  const [scanMode, setScanMode] = useState<"camera" | "upload" | "iot">(
    "camera",
  );
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<SpoilageResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [iotData, setIoTData] = useState<IoTSensorData>(mockIoTData);
  const [aiSensitivity, setAiSensitivity] = useState([75]);
  const [autoScan, setAutoScan] = useState(false);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [cameraSource, setCameraSource] = useState<'laptop' | 'esp32'>('laptop');
  const [laptopDeviceId, setLaptopDeviceId] = useState<string | undefined>(undefined);
  const [esp32ImageUrl, setEsp32ImageUrl] = useState<string>("");
  const [esp32ImageLoading, setEsp32ImageLoading] = useState<boolean>(false);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate live IoT data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIoTData((prev) => ({
        ...prev,
        temperature: 4.0 + Math.random() * 1.0,
        humidity: 60 + Math.random() * 10,
        lastUpdate: "Just now",
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scan in live mode
  useEffect(() => {
    if (isLiveMode && autoScan) {
      intervalRef.current = setInterval(() => {
        handleCameraCapture();
      }, 10000); // Scan every 10 seconds
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLiveMode, autoScan]);

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
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      const videoDevices = allDevices.filter(
        (device) =>
          device.kind === 'videoinput' &&
          device.label &&
          !/iriun|droid|virtual/i.test(device.label)
      );
      if (videoDevices.length > 0) {
        setLaptopDeviceId(videoDevices[0].deviceId);
      }
    });
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (cameraSource === 'esp32') {
      const fetchImage = () => {
        setEsp32ImageLoading(true);
        // Add a cache-busting timestamp to force refresh
        const url = `http://localhost:5000/latest_esp32_image?t=${Date.now()}`;
        setEsp32ImageUrl(url);
      };
      fetchImage();
      interval = setInterval(fetchImage, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraSource]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      simulateAnalysis();
    }
  };

  const handleCameraCapture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && model) {
      try {
        setIsScanning(true);
        const img = new Image();
        img.src = imageSrc;
        await img.decode();
        
        const predictions = await model.classify(img);
        console.log('Predictions:', predictions);
        
        // Simulate scan with the predictions
        simulateScan();
      } catch (error) {
        console.error('Error analyzing image:', error);
        setCameraError('Failed to analyze image');
      }
    }
  };

  const simulateAnalysis = () => {
    setIsScanning(true);
    // Simulate AI analysis time
    setTimeout(() => {
      setIsScanning(false);
      setScanResult(mockSpoilageResult);
    }, 3000);
  };

  const simulateScan = () => {
    setIsScanning(true);
    // Simulate AI analysis time
    setTimeout(() => {
      setIsScanning(false);
      setScanResult(mockSpoilageResult);
    }, 3000);
  };

  const resetScan = () => {
    setScanResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fresh":
        return "emerald";
      case "good":
        return "blue";
      case "warning":
        return "amber";
      case "spoiled":
        return "red";
      default:
        return "gray";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-amber-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const toggleLiveMode = () => {
    setIsLiveMode(!isLiveMode);
    if (!isLiveMode) {
      setScanResult(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Spoilage Detection
          </h1>
          <p className="text-xl text-gray-600">
            AI-powered food freshness analysis using computer vision and IoT
            sensors
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Badge
            className={
              iotData.connected
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }
          >
            {iotData.connected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                IoT Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                IoT Disconnected
              </>
            )}
          </Badge>
        </div>
      </div>

      <Tabs
        value={scanMode}
        onValueChange={(value) => setScanMode(value as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="camera" className="flex items-center">
            <Camera className="h-4 w-4 mr-2" />
            Camera Analysis
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </TabsTrigger>
          <TabsTrigger value="iot" className="flex items-center">
            <Thermometer className="h-4 w-4 mr-2" />
            IoT Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="space-y-6">
          {!scanResult ? (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="relative rounded-lg overflow-hidden bg-black flex-1">
                <select value={cameraSource} onChange={e => setCameraSource(e.target.value as 'laptop' | 'esp32')}>
                  {CAMERA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {cameraSource === 'laptop' ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full"
                    videoConstraints={{ deviceId: laptopDeviceId }}
                    onUserMediaError={(error) => {
                      setCameraError("Unable to access camera. Please check permissions.");
                    }}
                  />
                ) : (
                  <div className="w-full flex flex-col items-center justify-center">
                    {esp32ImageUrl ? (
                      <img
                        src={esp32ImageUrl}
                        alt="ESP32 Camera"
                        className="rounded-lg border border-emerald-400 max-w-full max-h-[480px]"
                        onLoad={() => setEsp32ImageLoading(false)}
                        onError={() => setEsp32ImageLoading(false)}
                      />
                    ) : null}
                    {esp32ImageLoading && <div className="text-gray-500 mt-2">Loading image...</div>}
                  </div>
                )}
                <div className="absolute inset-0 border-2 border-emerald-400 rounded-lg pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-emerald-400"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-emerald-400"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-emerald-400"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-emerald-400"></div>
                </div>
              </div>
              <Card className="w-full md:w-72 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-emerald-600" />
                    Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className="text-lg text-emerald-700 font-bold">
                      {scanResult?.predictedClass || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Confidence: {scanResult?.confidence ? `${scanResult.confidence.toFixed(1)}%` : '0%'}
                    </div>
                    {!scanResult && (
                      <div className="text-xs text-gray-500 mt-2">
                        Connect camera and start prediction
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className="text-center">
            <Button
              onClick={handleCameraCapture}
              size="lg"
              className="bg-health-gradient"
              disabled={!!cameraError || isScanning || isModelLoading}
            >
              {isScanning ? (
                <>
                  <Scan className="h-5 w-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5 mr-2" />
                  Capture & Analyze
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2 text-emerald-600" />
                Upload Food Image
              </CardTitle>
              <CardDescription>
                Upload a clear image of your food item for spoilage analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-emerald-200 rounded-lg p-12 text-center hover:border-emerald-300 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload Food Image
                </h3>
                <p className="text-gray-600 mb-4">
                  Choose a clear, well-lit image of your food item
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Choose File
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iot" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Thermometer className="h-5 w-5 mr-2 text-emerald-600" />
                  Environmental Monitoring
                </CardTitle>
                <CardDescription>
                  Real-time sensor data for optimal food storage conditions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Thermometer className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-700">
                      {iotData.temperature.toFixed(1)}°C
                    </div>
                    <div className="text-sm text-blue-600">Temperature</div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 rounded-lg">
                    <Droplets className="h-8 w-8 text-teal-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-teal-700">
                      {iotData.humidity.toFixed(0)}%
                    </div>
                    <div className="text-sm text-teal-600">Humidity</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Storage Conditions
                    </span>
                    <Badge className="bg-green-100 text-green-700">
                      Optimal
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Temperature Range</span>
                      <span className="text-green-600">Ideal (0-5°C)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Humidity Level</span>
                      <span className="text-green-600">Good (60-70%)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-emerald-600" />
                  Smart Alerts
                </CardTitle>
                <CardDescription>
                  Automated notifications based on sensor data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">
                      Storage Optimal
                    </h4>
                    <p className="text-sm text-green-700">
                      Current conditions are perfect for food storage
                    </p>
                    <p className="text-xs text-green-600 mt-1">2 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Thermometer className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">
                      Temperature Stable
                    </h4>
                    <p className="text-sm text-blue-700">
                      Temperature has been consistent for 2 hours
                    </p>
                    <p className="text-xs text-blue-600 mt-1">15 minutes ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
