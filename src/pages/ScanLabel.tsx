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

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  ingredients: string[];
  servingSize: string;
  healthScore: number;
  warnings: string[];
  benefits: string[];
}

const mockNutritionData: NutritionData = {
  calories: 150,
  protein: 12,
  carbs: 20,
  fat: 3,
  fiber: 8,
  sugar: 4,
  sodium: 480,
  ingredients: [
    "Organic Spinach",
    "Water",
    "Sea Salt",
    "Natural Flavoring",
    "Vitamin C",
    "Iron",
    "Calcium",
  ],
  servingSize: "1 cup (240ml)",
  healthScore: 8.7,
  warnings: ["High in sodium"],
  benefits: ["High in iron", "Good source of fiber", "Rich in vitamins"],
};

// Helper: Parse nutrition facts from OCR text
function parseNutritionFromText(text: string): Promise<NutritionData> {
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
        console.log('Nutrition data source:', data.source);
        return data.nutrition;
      }
      throw new Error(data.message || 'Failed to parse nutrition data');
    });
}

export default function ScanLabel() {
  const [scanMode, setScanMode] = useState<"upload" | "camera">("upload");
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

  const runOcrAndParse = async (imageSrc: string) => {
    setIsScanning(true);
    setCameraError(null); // Clear any previous errors
    try {
      // Show loading state
      setScanResult(null);
      
      const result = await Tesseract.recognize(imageSrc, 'eng', { 
        logger: m => console.log(m),
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;()[]{}%/-+ ',
        tessedit_pageseg_mode: '6' // Assume uniform text block
      });
      const text = result.data.text;
      console.log('OCR Text:', text);
      
      // Show processing state
      setProcessingStatus('Analyzing nutrition information...');
      
      const nutrition = await parseNutritionFromText(text);
      console.log('Parsed Nutrition:', nutrition);
      setScanResult(nutrition);
    } catch (err) {
      console.error('OCR Error:', err);
      setCameraError('Failed to analyze nutrition label. Please try again with better lighting and focus.');
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
        runOcrAndParse(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      runOcrAndParse(imageSrc);
    }
  };

  const resetScan = () => {
    setScanResult(null);
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
                  setScanMode(value as "upload" | "camera")
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="flex items-center">
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
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
                </TabsContent>

                <TabsContent value="camera" className="mt-6">
                  <div className="space-y-4">
                    {isModelLoading ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>Loading image analysis model...</AlertDescription>
                      </Alert>
                    ) : cameraError ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{cameraError}</AlertDescription>
                        <Button 
                          onClick={() => window.location.reload()} 
                          className="mt-4"
                          variant="outline"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry Camera Access
                        </Button>
                      </Alert>
                    ) : !hasPermission ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>Waiting for camera permission...</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="relative rounded-lg overflow-hidden bg-black">
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          className="w-full"
                          videoConstraints={videoConstraints}
                          onUserMediaError={(error) => {
                            setCameraError("Unable to access camera. Please check permissions.");
                          }}
                        />
                        <div className="absolute inset-0 border-2 border-emerald-400 rounded-lg pointer-events-none">
                          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-emerald-400"></div>
                          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-emerald-400"></div>
                          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-emerald-400"></div>
                          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-emerald-400"></div>
                        </div>
                      </div>
                    )}

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
                            Capture & Scan
                          </>
                        )}
                      </Button>
                    </div>
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
            </p>
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanResult && (
        <div className="space-y-8 opacity-100">
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
                    <span
                      className={`text-2xl font-bold text-${getHealthScoreColor(scanResult.health_score)}-600`}
                    >
                      {scanResult.health_score.toFixed(1)}
                    </span>
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
                    <Zap className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900">Calories</h3>
                  <p className="text-sm text-gray-600">
                    {scanResult.calories} per serving
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-4">
                    <Heart className="h-8 w-8 text-purple-600" />
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
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2 text-emerald-600" />
                Macronutrients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Protein</span>
                  <span className="text-sm text-gray-600">
                    {scanResult.protein}g
                  </span>
                </div>
                <Progress
                  value={(scanResult.protein / 50) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Carbohydrates</span>
                  <span className="text-sm text-gray-600">
                    {scanResult.carbs}g
                  </span>
                </div>
                <Progress
                  value={(scanResult.carbs / 300) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Fat</span>
                  <span className="text-sm text-gray-600">
                    {scanResult.fat}g
                  </span>
                </div>
                <Progress
                  value={(scanResult.fat / 70) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Fiber</span>
                  <span className="text-sm text-gray-600">
                    {scanResult.fiber}g
                  </span>
                </div>
                <Progress
                  value={(scanResult.fiber / 25) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Sugar</span>
                  <span className="text-sm text-gray-600">
                    {scanResult.sugar}g
                  </span>
                </div>
                <Progress
                  value={(scanResult.sugar / 50) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Sodium</span>
                  <span className="text-sm text-gray-600">
                    {scanResult.sodium}mg
                  </span>
                </div>
                <Progress
                  value={(scanResult.sodium / 2300) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

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
