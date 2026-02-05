"use client";

import React from "react";

interface WhatsAppFloatingButtonProps {
  phoneNumber: string; // Ej: "5491123456789" (código país + número)
  message?: string;
}

const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  phoneNumber,
  message = "Hola, quiero más información",
}) => {
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat en WhatsApp"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "46px",
        height: "46px",
        borderRadius: "50%",
        backgroundColor: "#25D366",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
        zIndex: 1000,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="white"
      >
        <path d="M20.52 3.48A11.82 11.82 0 0 0 12.04 0C5.42 0 .04 5.38.04 12c0 2.12.56 4.2 1.62 6.04L0 24l6.12-1.6a11.9 11.9 0 0 0 5.92 1.52h.04c6.62 0 12-5.38 12-12 0-3.2-1.24-6.2-3.56-8.44ZM12.04 22a9.9 9.9 0 0 1-5.04-1.4l-.36-.2-3.64.96.96-3.56-.24-.36A9.9 9.9 0 1 1 22 12c0 5.52-4.48 10-9.96 10Zm5.48-7.48c-.28-.16-1.64-.8-1.88-.88-.24-.08-.4-.16-.56.16-.16.28-.64.88-.8 1.08-.16.16-.28.2-.56.08-.28-.16-1.16-.44-2.2-1.4-.8-.72-1.36-1.6-1.52-1.88-.16-.28 0-.4.12-.56.12-.12.28-.32.4-.48.12-.16.16-.28.28-.48.08-.16.04-.32-.04-.48-.08-.16-.56-1.32-.76-1.8-.2-.48-.4-.4-.56-.4h-.48c-.16 0-.48.08-.72.36-.24.28-.96.92-.96 2.28s.96 2.64 1.08 2.8c.16.16 1.88 2.88 4.56 4.04.64.28 1.16.44 1.56.56.64.2 1.24.16 1.72.08.52-.08 1.64-.68 1.88-1.32.24-.64.24-1.2.16-1.32-.08-.12-.24-.2-.52-.36Z" />
      </svg>
    </a>
  );
};

export default WhatsAppFloatingButton;
