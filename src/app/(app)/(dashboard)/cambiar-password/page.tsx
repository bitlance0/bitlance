"use client";

import { useState } from "react";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function CambiarPasswordTab() {
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async () => {
    if (newPass !== confirmPass) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (newPass.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      toast.success("Contraseña actualizada correctamente");
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
      setLoading(false);
    }, 1000);
  };

  const PasswordInput = ({ 
    value, 
    onChange, 
    placeholder, 
    showPassword, 
    onToggleVisibility,
    className = ""
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    showPassword: boolean;
    onToggleVisibility: () => void;
    className?: string;
  }) => (
    <div className="relative">
      <input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full p-3 pr-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent ${className}`}
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Contraseña Actual */}
      <div className="rounded-xl p-4 border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <label className="text-sm font-medium block mb-2">
          Contraseña actual
        </label>
        <PasswordInput
          value={oldPass}
          onChange={setOldPass}
          placeholder="Ingresa tu contraseña actual"
          showPassword={showPasswords.old}
          onToggleVisibility={() => togglePasswordVisibility('old')}
        />
      </div>

      {/* Nueva Contraseña */}
      <div className="rounded-xl p-4 border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <label className="text-sm font-medium block mb-2">
          Nueva contraseña
        </label>
        <PasswordInput
          value={newPass}
          onChange={setNewPass}
          placeholder="Crea una nueva contraseña"
          showPassword={showPasswords.new}
          onToggleVisibility={() => togglePasswordVisibility('new')}
        />
        
        {/* Validación de fortaleza de contraseña */}
        {newPass && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                newPass.length >= 8 ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span className={newPass.length >= 8 ? 'text-green-400' : 'text-gray-400'}>
                Mínimo 8 caracteres
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Confirmar Nueva Contraseña */}
      <div className="rounded-xl p-4 border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
        <label className="text-sm font-medium block mb-2">
          Confirmar nueva contraseña
        </label>
        <PasswordInput
          value={confirmPass}
          onChange={setConfirmPass}
          placeholder="Repite tu nueva contraseña"
          showPassword={showPasswords.confirm}
          onToggleVisibility={() => togglePasswordVisibility('confirm')}
        />
        
        {/* Validación de coincidencia */}
        {confirmPass && newPass !== confirmPass && (
          <p className="text-red-400 text-xs mt-2">
            Las contraseñas no coinciden
          </p>
        )}
        {confirmPass && newPass === confirmPass && (
          <p className="text-green-400 text-xs mt-2">
            Las contraseñas coinciden
          </p>
        )}
      </div>

      {/* Botón de envío */}
      <button
        onClick={handleSubmit}
        disabled={loading || !oldPass || !newPass || !confirmPass || newPass !== confirmPass}
        className="w-full px-4 py-3 rounded-xl font-semibold bg-[var(--color-primary)] text-[var(--color-bg)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-primary-light)] transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4" />
            Actualizando...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Cambiar Contraseña
          </>
        )}
      </button>

      {/* Recomendaciones de seguridad */}
      <div className="text-xs text-[var(--color-text-muted)] space-y-1">
        <p className="font-medium">Recomendaciones de seguridad:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Usa una combinación de letras, números y símbolos</li>
          <li>Evita información personal fácil de adivinar</li>
          <li>No reutilices contraseñas de otros servicios</li>
        </ul>
      </div>
    </div>
  );
}