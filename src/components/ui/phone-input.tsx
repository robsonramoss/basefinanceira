"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Lista de países com DDI (sem o símbolo +)
const countries = [
  { code: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", dial: "1", flag: "🇺🇸" },
  { code: "CA", name: "Canadá", dial: "1", flag: "🇨🇦" },
  { code: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { code: "MX", name: "México", dial: "52", flag: "🇲🇽" },
  { code: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { code: "CO", name: "Colômbia", dial: "57", flag: "🇨🇴" },
  { code: "PE", name: "Peru", dial: "51", flag: "🇵🇪" },
  { code: "UY", name: "Uruguai", dial: "598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguai", dial: "595", flag: "🇵🇾" },
  { code: "BO", name: "Bolívia", dial: "591", flag: "🇧🇴" },
  { code: "VE", name: "Venezuela", dial: "58", flag: "🇻🇪" },
  { code: "EC", name: "Equador", dial: "593", flag: "🇪🇨" },
  { code: "ES", name: "Espanha", dial: "34", flag: "🇪🇸" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "FR", name: "França", dial: "33", flag: "🇫🇷" },
  { code: "IT", name: "Itália", dial: "39", flag: "🇮🇹" },
  { code: "DE", name: "Alemanha", dial: "49", flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido", dial: "44", flag: "🇬🇧" },
  { code: "NL", name: "Holanda", dial: "31", flag: "🇳🇱" },
  { code: "BE", name: "Bélgica", dial: "32", flag: "🇧🇪" },
  { code: "CH", name: "Suíça", dial: "41", flag: "🇨🇭" },
  { code: "AT", name: "Áustria", dial: "43", flag: "🇦🇹" },
  { code: "SE", name: "Suécia", dial: "46", flag: "🇸🇪" },
  { code: "NO", name: "Noruega", dial: "47", flag: "🇳🇴" },
  { code: "DK", name: "Dinamarca", dial: "45", flag: "🇩🇰" },
  { code: "FI", name: "Finlândia", dial: "358", flag: "🇫🇮" },
  { code: "IE", name: "Irlanda", dial: "353", flag: "🇮🇪" },
  { code: "PL", name: "Polônia", dial: "48", flag: "🇵🇱" },
  { code: "CZ", name: "República Tcheca", dial: "420", flag: "🇨🇿" },
  { code: "HU", name: "Hungria", dial: "36", flag: "🇭🇺" },
  { code: "RO", name: "Romênia", dial: "40", flag: "🇷🇴" },
  { code: "GR", name: "Grécia", dial: "30", flag: "🇬🇷" },
  { code: "TR", name: "Turquia", dial: "90", flag: "🇹🇷" },
  { code: "RU", name: "Rússia", dial: "7", flag: "🇷🇺" },
  { code: "CN", name: "China", dial: "86", flag: "🇨🇳" },
  { code: "JP", name: "Japão", dial: "81", flag: "🇯🇵" },
  { code: "KR", name: "Coreia do Sul", dial: "82", flag: "🇰🇷" },
  { code: "IN", name: "Índia", dial: "91", flag: "🇮🇳" },
  { code: "AU", name: "Austrália", dial: "61", flag: "🇦🇺" },
  { code: "NZ", name: "Nova Zelândia", dial: "64", flag: "🇳🇿" },
  { code: "ZA", name: "África do Sul", dial: "27", flag: "🇿🇦" },
  { code: "EG", name: "Egito", dial: "20", flag: "🇪🇬" },
  { code: "IL", name: "Israel", dial: "972", flag: "🇮🇱" },
  { code: "AE", name: "Emirados Árabes", dial: "971", flag: "🇦🇪" },
  { code: "SA", name: "Arábia Saudita", dial: "966", flag: "🇸🇦" },
];

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  showSaveFormat?: boolean;
}

// Função para detectar país por IP
const detectCountryByIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return data.country_code || 'BR'; // Default Brasil
  } catch (error) {
    return 'BR'; // Default Brasil em caso de erro
  }
};

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = "", onChange, placeholder = "Digite seu número", showSaveFormat = false }, ref) => {
    const [selectedCountry, setSelectedCountry] = React.useState(countries[0]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [phoneNumber, setPhoneNumber] = React.useState("");
    const [isDetecting, setIsDetecting] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState("");
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // Detectar país por IP ao montar o componente (com cache)
    React.useEffect(() => {
      const detectCountry = async () => {
        // Verificar cache no localStorage
        const cachedCountry = localStorage.getItem('detected_country');
        
        if (cachedCountry) {
          const country = countries.find(c => c.code === cachedCountry);
          if (country) {
            setSelectedCountry(country);
            setIsDetecting(false);
            return;
          }
        }

        // Se não tem cache, detectar
        const countryCode = await detectCountryByIP();
        const detectedCountry = countries.find(c => c.code === countryCode);
        if (detectedCountry) {
          setSelectedCountry(detectedCountry);
          // Salvar no cache
          localStorage.setItem('detected_country', countryCode);
        }
        setIsDetecting(false);
      };

      detectCountry();
    }, []);

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value.replace(/\D/g, "");
      setPhoneNumber(input);
      // Salva SEM o símbolo +
      const fullPhone = `${selectedCountry.dial}${input}`;
      onChange?.(fullPhone);
    };

    const formatDisplay = (phone: string) => {
      const digits = phone.replace(/\D/g, "");
      if (selectedCountry.code === "BR") {
        if (digits.length <= 2) return `(${digits}`;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
      return phone;
    };

    // Filtrar países pela busca
    const filteredCountries = countries.filter(country =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dial.includes(searchTerm)
    );

    const fullPhoneValue = `${selectedCountry.dial}${phoneNumber.replace(/\D/g, "")}`;

    return (
      <div className="w-full space-y-2">
        <div className="flex gap-2">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 h-[48px] px-4 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] hover:bg-[var(--bg-hover)] transition-all text-[var(--input-text)]"
              disabled={isDetecting}
            >
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="text-sm font-medium">+{selectedCountry.dial}</span>
              <ChevronDown className={cn(
                "h-4 w-4 text-[var(--text-tertiary)] transition-transform",
                isOpen && "rotate-180"
              )} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden">
                {/* Campo de busca */}
                <div className="p-2 border-b border-[var(--border-medium)] sticky top-0 bg-[var(--bg-elevated)]">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar país..."
                    className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:border-[#22C55E]"
                    autoFocus
                  />
                </div>
                
                {/* Lista de países */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setIsOpen(false);
                          setSearchTerm("");
                          // Salva SEM o +
                          onChange?.(`${country.dial}${phoneNumber.replace(/\D/g, "")}`);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)] transition-colors text-left",
                          selectedCountry.code === country.code && "bg-[#22C55E]/10"
                        )}
                      >
                        <span className="text-xl">{country.flag}</span>
                        <span className="text-sm text-[var(--text-primary)] flex-1">{country.name}</span>
                        <span className="text-sm text-[var(--text-secondary)]">+{country.dial}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
                      Nenhum país encontrado
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <input
            ref={ref}
            type="tel"
            value={formatDisplay(phoneNumber)}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            className="flex-1 h-[48px] px-4 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 transition-all text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none"
          />
        </div>

        {/* Show save format preview */}
        {showSaveFormat && phoneNumber && (
          <div className="text-xs text-[var(--text-tertiary)] flex items-center gap-2">
            <span>Salvo como:</span>
            <code className="px-2 py-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded text-[#22C55E]">
              {fullPhoneValue}
            </code>
          </div>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
