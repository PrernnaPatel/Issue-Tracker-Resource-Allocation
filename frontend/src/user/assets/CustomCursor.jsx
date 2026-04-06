import React, { useEffect, useState } from "react";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const moveCursor = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, []);

  return (
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{
        top: position.y - 10,
        left: position.x - 10,
        width: 20,
        height: 20,
        borderRadius: "50%",
        backgroundColor: "#5B21B6", // dark purple
        position: "absolute",
        transition: "top 0.05s, left 0.05s", // smooth movement
      }}
    />
  );
}