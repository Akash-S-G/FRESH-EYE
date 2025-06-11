import { useState } from "react";
import {
  Mail,
  Bell,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  Settings,
  Save,
  Send,
  Plus,
  X,
  Calendar,
  Smartphone,
  Monitor,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NotificationSettings {
  email: {
    dailySummary: boolean;
    weeklyReport: boolean;
    expirationAlerts: boolean;
    healthInsights: boolean;
    safetyWarnings: boolean;
    productRecalls: boolean;
    nutritionGoals: boolean;
    newFeatures: boolean;
  };
  push: {
    immediateAlerts: boolean;
    dailyReminders: boolean;
    goalAchievements: boolean;
    healthTips: boolean;
  };
  preferences: {
    frequency: string;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    emailFormat: string;
    language: string;
  };
  recipients: string[];
  customAlerts: Array<{
    id: string;
    name: string;
    condition: string;
    threshold: string;
    enabled: boolean;
  }>;
}

const initialSettings: NotificationSettings = {
  email: {
    dailySummary: true,
    weeklyReport: true,
    expirationAlerts: true,
    healthInsights: true,
    safetyWarnings: true,
    productRecalls: true,
    nutritionGoals: false,
    newFeatures: false,
  },
  push: {
    immediateAlerts: true,
    dailyReminders: true,
    goalAchievements: true,
    healthTips: false,
  },
  preferences: {
    frequency: "daily",
    quietHours: {
      enabled: true,
      start: "22:00",
      end: "07:00",
    },
    emailFormat: "html",
    language: "en",
  },
  recipients: ["sarah.johnson@email.com"],
  customAlerts: [
    {
      id: "1",
      name: "High Sodium Alert",
      condition: "sodium_intake",
      threshold: "2000mg",
      enabled: true,
    },
    {
      id: "2",
      name: "Low Protein Warning",
      condition: "protein_intake",
      threshold: "50g",
      enabled: true,
    },
  ],
};

export default function EmailSettings() {
  const [settings, setSettings] =
    useState<NotificationSettings>(initialSettings);
  const [testEmail, setTestEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({
    name: "",
    condition: "",
    threshold: "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleTestEmail = async () => {
    setIsTestSending(true);
    // Simulate sending test email
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsTestSending(false);
  };

  const addRecipient = () => {
    if (newRecipient && !settings.recipients.includes(newRecipient)) {
      setSettings({
        ...settings,
        recipients: [...settings.recipients, newRecipient],
      });
      setNewRecipient("");
    }
  };

  const removeRecipient = (email: string) => {
    setSettings({
      ...settings,
      recipients: settings.recipients.filter((r) => r !== email),
    });
  };

  const addCustomAlert = () => {
    if (newAlert.name && newAlert.condition && newAlert.threshold) {
      setSettings({
        ...settings,
        customAlerts: [
          ...settings.customAlerts,
          {
            id: Date.now().toString(),
            ...newAlert,
            enabled: true,
          },
        ],
      });
      setNewAlert({ name: "", condition: "", threshold: "" });
      setShowAddAlert(false);
    }
  };

  const removeCustomAlert = (id: string) => {
    setSettings({
      ...settings,
      customAlerts: settings.customAlerts.filter((alert) => alert.id !== id),
    });
  };

  const toggleCustomAlert = (id: string) => {
    setSettings({
      ...settings,
      customAlerts: settings.customAlerts.map((alert) =>
        alert.id === id ? { ...alert, enabled: !alert.enabled } : alert,
      ),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Notification Settings
          </h1>
          <p className="text-lg text-gray-600">
            Configure how and when you receive food safety alerts and updates
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-700 mt-4 md:mt-0"
        >
          {isSaving ? (
            <>
              <Settings className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="flex items-center">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="push" className="flex items-center">
            <Smartphone className="h-4 w-4 mr-2" />
            Push
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Custom Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Email Notifications */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-emerald-600" />
                  Email Notifications
                </CardTitle>
                <CardDescription>
                  Choose which email notifications you'd like to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Daily Summary</Label>
                    <p className="text-xs text-gray-500">
                      Overview of your daily food scans and health score
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.dailySummary}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, dailySummary: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Weekly Report</Label>
                    <p className="text-xs text-gray-500">
                      Comprehensive weekly nutrition and safety analysis
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.weeklyReport}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, weeklyReport: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      Expiration Alerts
                    </Label>
                    <p className="text-xs text-gray-500">
                      Notifications when food items are about to expire
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.expirationAlerts}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, expirationAlerts: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      Health Insights
                    </Label>
                    <p className="text-xs text-gray-500">
                      Personalized nutrition tips and recommendations
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.healthInsights}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, healthInsights: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      Safety Warnings
                    </Label>
                    <p className="text-xs text-gray-500">
                      Immediate alerts for food safety concerns
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.safetyWarnings}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, safetyWarnings: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      Product Recalls
                    </Label>
                    <p className="text-xs text-gray-500">
                      Notifications about recalled food products
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.productRecalls}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, productRecalls: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">
                      Nutrition Goals
                    </Label>
                    <p className="text-xs text-gray-500">
                      Updates on your daily nutrition goal progress
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.nutritionGoals}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, nutritionGoals: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">New Features</Label>
                    <p className="text-xs text-gray-500">
                      Updates about new FreshGuard features
                    </p>
                  </div>
                  <Switch
                    checked={settings.email.newFeatures}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        email: { ...settings.email, newFeatures: checked },
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Recipients */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Monitor className="h-5 w-5 mr-2 text-emerald-600" />
                  Email Recipients
                </CardTitle>
                <CardDescription>
                  Manage who receives email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Recipients</Label>
                  <div className="space-y-2 mt-2">
                    {settings.recipients.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm">{email}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(email)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Input
                    placeholder="Add email address"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && addRecipient()}
                  />
                  <Button onClick={addRecipient} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                {/* Test Email */}
                <div>
                  <Label>Test Email</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Send a test notification to verify your email settings
                  </p>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Test email address"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <Button
                      onClick={handleTestEmail}
                      disabled={isTestSending || !testEmail}
                      variant="outline"
                    >
                      {isTestSending ? (
                        <>
                          <Settings className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Test
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="push" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="h-5 w-5 mr-2 text-emerald-600" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Configure push notifications for immediate alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Immediate Safety Alerts
                  </Label>
                  <p className="text-xs text-gray-500">
                    Critical food safety warnings and recalls
                  </p>
                </div>
                <Switch
                  checked={settings.push.immediateAlerts}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      push: { ...settings.push, immediateAlerts: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Daily Reminders</Label>
                  <p className="text-xs text-gray-500">
                    Reminders to scan food items and check goals
                  </p>
                </div>
                <Switch
                  checked={settings.push.dailyReminders}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      push: { ...settings.push, dailyReminders: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Goal Achievements
                  </Label>
                  <p className="text-xs text-gray-500">
                    Notifications when you reach nutrition goals
                  </p>
                </div>
                <Switch
                  checked={settings.push.goalAchievements}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      push: { ...settings.push, goalAchievements: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Health Tips</Label>
                  <p className="text-xs text-gray-500">
                    Periodic health and nutrition tips
                  </p>
                </div>
                <Switch
                  checked={settings.push.healthTips}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      push: { ...settings.push, healthTips: checked },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-emerald-600" />
                  Timing Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email Frequency</Label>
                  <Select
                    value={settings.preferences.frequency}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        preferences: {
                          ...settings.preferences,
                          frequency: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily Digest</SelectItem>
                      <SelectItem value="weekly">Weekly Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Quiet Hours</Label>
                    <Switch
                      checked={settings.preferences.quietHours.enabled}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          preferences: {
                            ...settings.preferences,
                            quietHours: {
                              ...settings.preferences.quietHours,
                              enabled: checked,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  {settings.preferences.quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">From</Label>
                        <Input
                          type="time"
                          value={settings.preferences.quietHours.start}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              preferences: {
                                ...settings.preferences,
                                quietHours: {
                                  ...settings.preferences.quietHours,
                                  start: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">To</Label>
                        <Input
                          type="time"
                          value={settings.preferences.quietHours.end}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              preferences: {
                                ...settings.preferences,
                                quietHours: {
                                  ...settings.preferences.quietHours,
                                  end: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-emerald-600" />
                  Format Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email Format</Label>
                  <Select
                    value={settings.preferences.emailFormat}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        preferences: {
                          ...settings.preferences,
                          emailFormat: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="html">Rich HTML</SelectItem>
                      <SelectItem value="text">Plain Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Language</Label>
                  <Select
                    value={settings.preferences.language}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        preferences: {
                          ...settings.preferences,
                          language: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2 text-emerald-600" />
                Custom Alerts
              </CardTitle>
              <CardDescription>
                Create personalized alerts based on your health goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {settings.customAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={() => toggleCustomAlert(alert.id)}
                      />
                      <div>
                        <h4 className="font-medium">{alert.name}</h4>
                        <p className="text-sm text-gray-500">
                          When {alert.condition} {alert.threshold}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCustomAlert(alert.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {showAddAlert ? (
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg space-y-3">
                    <Input
                      placeholder="Alert name"
                      value={newAlert.name}
                      onChange={(e) =>
                        setNewAlert({ ...newAlert, name: e.target.value })
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={newAlert.condition}
                        onValueChange={(value) =>
                          setNewAlert({ ...newAlert, condition: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sodium_intake">
                            Sodium intake exceeds
                          </SelectItem>
                          <SelectItem value="protein_intake">
                            Protein intake below
                          </SelectItem>
                          <SelectItem value="sugar_intake">
                            Sugar intake exceeds
                          </SelectItem>
                          <SelectItem value="calorie_intake">
                            Calorie intake exceeds
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Threshold (e.g., 2000mg)"
                        value={newAlert.threshold}
                        onChange={(e) =>
                          setNewAlert({
                            ...newAlert,
                            threshold: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddAlert(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={addCustomAlert}>Add Alert</Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowAddAlert(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Alert
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
