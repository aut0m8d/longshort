"use client";

import { useState } from "react";

interface MintInputProps {
  onSubmit: (targetMint: string) => void;
}

export const MintInput = ({ onSubmit }: MintInputProps) => {
  const [targetMint, setTargetMint] = useState(
    "ijFmdLw8Vn64VjWSUXvqDKfkuti3g6oiRpjfR3g9GFM"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(targetMint);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="targetMint" className="text-gray-400">
          Target Token Mint Address
        </label>
        <div className="flex gap-2">
          <input
            id="targetMint"
            type="text"
            value={targetMint}
            onChange={(e) => setTargetMint(e.target.value)}
            placeholder="Enter token mint address"
            className="flex-1 px-4 py-2 bg-gray-800 rounded-lg border border-game-accent/20
            focus:outline-none focus:border-game-accent text-white"
          />
          <button
            type="submit"
            className="game-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set Token
          </button>
        </div>
      </div>
    </form>
  );
};
