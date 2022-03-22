import React, { useState } from "react";

export const Unmounter = ({ above = false, children }) => {
  const [mounted, setMounted] = useState(true);
  const content = [
    children,
    <p>
      <button data-testid="unmounter-button" onClick={() => setMounted((m) => !m)}>
        {mounted ? "Unmount" : "Remount"}
      </button>
    </p>
  ]
  above && content.reverse()
  return (
    <div>
      {mounted && content }
      {!mounted && "Unmounted!"}
    </div>
  );
};
