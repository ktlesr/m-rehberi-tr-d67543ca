import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, TestTube, Cloud, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const TesviksorApiManager = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setStatus('idle');
    setResponseTime(null);
    
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("vertex-rag-query", {
        body: { messages: [{ role: "user", content: "Test bağlantısı" }] }
      });
      
      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      
      if (error) throw error;
      
      setStatus('success');
      toast({ 
        title: "Başarılı", 
        description: `TeşvikSor API bağlantısı aktif (${endTime - startTime}ms)` 
      });
    } catch (error) {
      setStatus('error');
      toast({ 
        title: "Hata", 
        description: error instanceof Error ? error.message : "Bağlantı hatası", 
        variant: "destructive" 
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Cloud className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">TeşvikSor API</h3>
            <p className="text-xs text-muted-foreground">
              Teşvik ve yatırım sorguları için özel API
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          api.tesviksor.com
        </Badge>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="text-muted-foreground">
            Bu mod, teşvik ve yatırım sorgularını <strong className="text-foreground">api.tesviksor.com</strong> üzerinden 
            işler. API, aşağıdaki konularda optimize edilmiştir:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            <li>NACE kodları ve sektör bilgileri</li>
            <li>İl bazlı teşvik hesaplamaları</li>
            <li>Yatırım destek programları</li>
            <li>Bölgesel teşvik oranları</li>
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleTestConnection} 
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              Bağlantı Test Et
            </Button>
            
            {status === 'success' && (
              <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3" /> 
                Başarılı {responseTime && `(${responseTime}ms)`}
              </Badge>
            )}
            
            {status === 'error' && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" /> Bağlantı Hatası
              </Badge>
            )}
          </div>

          <a 
            href="https://api.tesviksor.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            API Dokümantasyonu
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
