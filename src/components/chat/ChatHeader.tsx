import { ChevronLeft, ChevronRight, Trash2, Download, Edit2, Check, X, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ChatHeaderProps {
  sessionTitle: string;
  onClearChat: () => void;
  onExportChat: () => void;
  onRenameSession: (newTitle: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ChatHeader({ 
  sessionTitle, 
  onClearChat, 
  onExportChat,
  onRenameSession,
  isCollapsed = false,
  onToggleCollapse,
}: ChatHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(sessionTitle);

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onRenameSession(editedTitle.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(sessionTitle);
    setIsEditing(false);
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 h-14 sm:h-16 md:h-[72px]">
        {/* Left: Toggle sidebar button */}
        {onToggleCollapse ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
            className="h-8 w-8 md:h-10 md:w-10 hidden lg:flex"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            ) : (
              <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </Button>
        ) : (
          <div className="w-8 md:w-10 hidden lg:block" />
        )}

        {/* Center: Session title (editable) */}
        <div className="flex items-center gap-2 flex-1 md:justify-center md:max-w-md px-2">
          {isEditing ? (
            <>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="flex-1 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={handleSaveTitle}>
                <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={handleCancelEdit}>
                <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-sm md:text-lg font-semibold break-words line-clamp-2 flex-1">{sessionTitle}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 md:h-8 md:w-8 hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                onClick={() => setIsEditing(true)}
                title="Yeniden adlandır"
              >
                <Edit2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
              </Button>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5 md:gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700 text-xs px-2 py-0.5 gap-1 hidden sm:flex items-center cursor-help"
                >
                  <FlaskConical className="h-3 w-3" />
                  Beta
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Bu özellik beta aşamasındadır. Geri bildirimlerinizi bekliyoruz.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="icon"
            onClick={onExportChat}
            title="Sohbeti dışa aktar"
            className="h-8 w-8 md:h-10 md:w-10 hidden sm:flex"
          >
            <Download className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            title="Sohbeti temizle"
            className="h-8 w-8 md:h-10 md:w-10"
          >
            <Trash2 className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
