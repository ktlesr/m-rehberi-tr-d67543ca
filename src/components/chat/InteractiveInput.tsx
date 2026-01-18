/**
 * Interactive Input Components
 * 
 * API'den gelen interaktif sorular için UI bileşenleri.
 * İl, ilçe, sektör seçimi ve OSB durumu için özelleştirilmiş inputlar.
 * Framer Motion animasyonları ile zenginleştirilmiştir.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Search, Building2, MapPin, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { InteractionConfig } from '@/utils/structuredResponseRenderer';

interface InteractiveInputProps {
  config: InteractionConfig;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

// =================== SELECT INPUT ===================

interface SelectInputProps {
  options: InteractionConfig['options'];
  placeholder?: string;
  allowSearch?: boolean;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

function SelectInput({ options, placeholder, allowSearch, onSelect, disabled }: SelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  const filteredOptions = useMemo(() => {
    if (!searchQuery || !allowSearch) return options || [];
    
    const query = searchQuery.toLowerCase();
    return (options || []).filter(opt => 
      opt.label.toLowerCase().includes(query) ||
      opt.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery, allowSearch]);

  const selectedOption = options?.find(opt => opt.value === selectedValue);

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSubmit = () => {
    if (selectedValue) {
      onSelect(selectedValue);
    }
  };

  return (
    <div className="space-y-3">
      {/* Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 rounded-lg border',
            'bg-background text-left transition-all',
            isOpen 
              ? 'border-primary ring-2 ring-primary/20' 
              : 'border-border hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className={cn(
            'text-sm',
            selectedOption ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {selectedOption?.label || placeholder || 'Seçin...'}
          </span>
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {/* Dropdown Menu with AnimatePresence */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {/* Search Input */}
              {allowSearch && (
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Options List */}
              <ScrollArea className="max-h-60">
                <div className="p-1">
                  {filteredOptions.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Sonuç bulunamadı
                    </div>
                  ) : (
                    filteredOptions.map((option, index) => (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm',
                          'transition-colors text-left',
                          selectedValue === option.value
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        )}
                      >
                        {option.icon && (
                          <span className="text-base">{option.icon}</span>
                        )}
                        <span className="flex-1">{option.label}</span>
                        {option.region && (
                          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                            {option.region}. Bölge
                          </span>
                        )}
                        {selectedValue === option.value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </motion.button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Button with animation */}
      <AnimatePresence>
        {selectedValue && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              className="w-full"
            >
              Devam Et
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =================== RADIO INPUT ===================

interface RadioInputProps {
  options: InteractionConfig['options'];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

function RadioInput({ options, onSelect, disabled }: RadioInputProps) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedValue) {
      onSelect(selectedValue);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {options?.map((option, index) => (
          <motion.button
            key={option.value}
            type="button"
            onClick={() => !disabled && setSelectedValue(option.value)}
            disabled={disabled}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
              selectedValue === option.value
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50 bg-background',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {option.icon && (
              <span className="text-2xl">{option.icon}</span>
            )}
            <span className={cn(
              'text-sm font-medium',
              selectedValue === option.value ? 'text-primary' : 'text-foreground'
            )}>
              {option.label}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedValue && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              className="w-full"
            >
              Devam Et
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =================== SEARCH INPUT ===================

interface SearchInputProps {
  placeholder?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

function SearchInput({ placeholder, onSubmit, disabled }: SearchInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder || 'Yazın...'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="pl-9"
        />
      </div>

      <AnimatePresence>
        {value.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              className="w-full"
            >
              Ara
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =================== TEXT INPUT ===================

interface TextInputProps {
  placeholder?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

function TextInput({ placeholder, onSubmit, disabled }: TextInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <Input
        type="text"
        placeholder={placeholder || 'Yazın...'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      <AnimatePresence>
        {value.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={disabled}
              className="w-full"
            >
              Gönder
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =================== MAIN COMPONENT ===================

export function InteractiveInput({ config, onSubmit, disabled }: InteractiveInputProps) {
  // Field'a göre ikon seç
  const getFieldIcon = () => {
    switch (config.field) {
      case 'province':
        return <MapPin className="h-5 w-5 text-primary" />;
      case 'district':
        return <MapPin className="h-5 w-5 text-primary" />;
      case 'sector':
        return <Factory className="h-5 w-5 text-primary" />;
      case 'osb_status':
        return <Building2 className="h-5 w-5 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className="mt-4 p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20"
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay: 0.4,  // Diğer içeriklerden sonra
        type: 'spring',
        stiffness: 150,
        damping: 20
      }}
    >
      {/* Question Header */}
      <motion.div 
        className="flex items-start gap-3 mb-4"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          {getFieldIcon()}
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">
            {config.field === 'province' && 'İl Seçimi'}
            {config.field === 'district' && 'İlçe Seçimi'}
            {config.field === 'sector' && 'Sektör Arama'}
            {config.field === 'osb_status' && 'OSB Durumu'}
          </p>
          <p className="text-sm font-medium text-foreground">
            {config.questionText}
          </p>
        </div>
      </motion.div>

      {/* Input Component - delayed animation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      >
        {config.inputType === 'select' && (
          <SelectInput
            options={config.options}
            placeholder={config.placeholder}
            allowSearch={config.allowSearch}
            onSelect={onSubmit}
            disabled={disabled}
          />
        )}

        {config.inputType === 'radio' && (
          <RadioInput
            options={config.options}
            onSelect={onSubmit}
            disabled={disabled}
          />
        )}

        {config.inputType === 'search' && (
          <SearchInput
            placeholder={config.placeholder}
            onSubmit={onSubmit}
            disabled={disabled}
          />
        )}

        {config.inputType === 'text' && (
          <TextInput
            placeholder={config.placeholder}
            onSubmit={onSubmit}
            disabled={disabled}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
