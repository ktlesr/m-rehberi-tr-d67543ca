import { Plus, Search, Trash2, ChevronLeft, ChevronRight, MessageSquare, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { ChatSession } from "@/hooks/useChatSession";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (id: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  isCollapsed = false,
  onToggleCollapse,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-col h-full border-r bg-background transition-all duration-300",
          isCollapsed ? "w-16" : "w-full",
        )}
      >
        {/* Logo Section - Clickable to home */}
        <div
          className={cn(
            "flex items-center border-b transition-all duration-300 h-14 sm:h-16 md:h-[72px]",
            isCollapsed ? "p-2 justify-center" : "px-4 justify-center"
          )}
        >
          <Link to="/" className={cn(
            "hover:opacity-80 transition-opacity",
            isCollapsed ? "flex items-center justify-center" : "block w-full"
          )}>
            {isCollapsed ? (
              <Home className="h-5 w-5 text-primary" />
            ) : (
              <Logo className="h-16 w-full transition-all duration-300 text-primary" />
            )}
          </Link>
        </div>

        {/* Toggle Button */}
        {onToggleCollapse && (
          <div className="px-2 py-2 border-b">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="w-full flex items-center justify-center"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      <span>Daralt</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p>Genişlet</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        )}

        {/* Button and Search */}
        <div className={cn("border-b space-y-3 transition-all duration-300", isCollapsed ? "p-2" : "p-4")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onCreateSession} className="w-full" variant="default">
                <Plus className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                {!isCollapsed && "Yeni Sohbet"}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <p>Yeni Sohbet</p>
              </TooltipContent>
            )}
          </Tooltip>

          {!isCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sohbet ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className={cn("space-y-1", isCollapsed ? "p-1" : "p-2")}>
            {filteredSessions.map((session) => (
              <Tooltip key={session.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "group relative flex items-center gap-2 rounded-lg cursor-pointer transition-colors",
                      isCollapsed ? "p-2 justify-center" : "p-3",
                      activeSessionId === session.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                    )}
                    onClick={() => onSelectSession(session.id)}
                  >
                    {isCollapsed ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{session.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(session.updatedAt, {
                              addSuffix: true,
                              locale: tr,
                            })}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{session.title}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}

            {filteredSessions.length === 0 && !isCollapsed && (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery ? "Sohbet bulunamadı" : "Henüz sohbet yok"}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
