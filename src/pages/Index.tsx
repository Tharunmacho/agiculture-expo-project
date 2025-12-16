import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatInterface } from "@/components/ChatInterface";
import { PlantIdentification } from "@/components/PlantIdentification";
import { SettingsComponent } from "@/components/Settings";
import { WelcomeExperience } from "@/components/WelcomeExperience";
import React from "react";
import { 
  Sprout, 
  MessageSquare, 
  Camera, 
  Leaf, 
  Users, 
  Globe,
  Smartphone,
  Heart,
  Tractor,
  Sun,
  Settings
} from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState(() => {
    // Get tab from URL params if available
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tab') || 'chat';
  });
  const { user, profile, signOut } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  // Update URL when tab changes
  React.useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState(null, '', url.toString());
  }, [activeTab]);

  // Show welcome experience for new users
  React.useEffect(() => {
    if (profile && !localStorage.getItem(`welcome_shown_${profile.id}`)) {
      setShowWelcome(true);
    }
  }, [profile]);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    if (profile) {
      localStorage.setItem(`welcome_shown_${profile.id}`, 'true');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      {showWelcome && <WelcomeExperience onComplete={handleWelcomeComplete} />}
      
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <Header />

      {/* Hero Section */}
      <section className="py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
              Transform Your <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Agricultural Journey</span>
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Get expert agricultural advice, identify plant diseases, optimize crop yields, and make data-driven farming decisions with our advanced AI assistant powered by cutting-edge technology.
            </p>
            
            {/* Enhanced Feature Pills */}
            <div className="flex flex-wrap justify-center gap-4 mt-12">
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border shadow-sm hover:shadow-md transition-all">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-gray-700">🌾 Smart Chat Assistant</span>
              </div>
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border shadow-sm hover:shadow-md transition-all">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-gray-700">📸 Plant Identification</span>
              </div>
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border shadow-sm hover:shadow-md transition-all">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-gray-700">🌿 Expert Care Tips</span>
              </div>
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-3 border shadow-sm hover:shadow-md transition-all">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-gray-700">💝 Always Free</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main App Interface */}
      <main className="px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 h-12">
              <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="identify" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <Camera className="w-4 h-4 mr-2" />
                Identify
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-8">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Chat with Your AI Farm Expert
                  </h3>
                </div>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Ask detailed questions about crops, soil health, weather patterns, pest control, or any farming challenge. 
                  Get comprehensive, expert-level advice in seconds.
                </p>
              </div>
              <ChatInterface />
            </TabsContent>

            <TabsContent value="identify" className="space-y-8">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Identify Plants & Get Care Tips
                  </h3>
                </div>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Upload a photo to instantly identify plants, detect diseases, and receive personalized care instructions 
                  tailored to your specific growing conditions.
                </p>
              </div>
              <PlantIdentification />
            </TabsContent>

            <TabsContent value="settings" className="space-y-8">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent">
                    Configuration & API Settings
                  </h3>
                </div>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Configure your API keys and select your preferred AI models for the best farming assistance experience.
                </p>
              </div>
              <SettingsComponent />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-white/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Empowering Farmers Worldwide</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI-powered platform makes agricultural expertise accessible to small-scale farmers everywhere, 
              helping increase yields and improve crop health.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center space-y-4 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Expert Knowledge</h4>
              <p className="text-muted-foreground">
                Access agricultural expertise that was previously only available to large commercial farms
              </p>
            </Card>
            
            <Card className="p-6 text-center space-y-4 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Mobile Accessible</h4>
              <p className="text-muted-foreground">
                Works on any smartphone, even with poor internet connectivity in rural areas
              </p>
            </Card>
            
            <Card className="p-6 text-center space-y-4 border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Tractor className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-xl font-semibold">Practical Solutions</h4>
              <p className="text-muted-foreground">
                Get actionable advice tailored to your specific crops, location, and farming conditions
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sprout className="w-6 h-6" />
            <span className="text-lg font-semibold">FarmAI Assistant</span>
          </div>
          <p className="text-sm opacity-80 mb-4">
            Empowering farmers with AI-powered agricultural knowledge and plant identification
          </p>
          <div className="flex justify-center items-center gap-2 text-xs opacity-60">
            <Sun className="w-4 h-4" />
            <span>Built with care for farmers worldwide</span>
          </div>
        </div>
      </footer>
    </div>
  </>
  );
};

export default Index;
