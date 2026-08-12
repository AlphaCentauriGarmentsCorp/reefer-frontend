import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useFavorites } from "../../hooks/useFavorites";
import SignInPrompt from "../SignInPrompt";

// The heart. Favorites are account-tied, so a signed-out tap asks before doing
// anything: this used to navigate straight to /sign-in, which took the shopper off
// the product they were looking at without explaining why or offering a way back.
// `variant`: "full" = the PDP's labelled button, "icon" = the corner heart on a card.
export default function FavoriteButton({ slug, variant = "full", style }) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState(false);
  const on = isFavorite(slug);

  const click = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // cards wrap this in a link
    if (!user) {
      setGate(true);
      return;
    }
    setBusy(true);
    try {
      await toggle(slug);
    } finally {
      setBusy(false);
    }
  };

  // Rendered in BOTH branches: the icon variant lives inside a card that is itself a
  // <Link>, so the dialog has to come from this component or a tap on the heart would
  // navigate to the product instead of asking.
  const prompt = (
    <SignInPrompt
      open={gate}
      onClose={() => setGate(false)}
      action="save favourites"
      reason="Favourites are saved to your account."
    />
  );

  if (variant === "icon") {
    return (
      <>
      <button
        onClick={click}
        aria-label={on ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={on}
        title={on ? "Remove from favorites" : "Add to favorites"}
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #101010",
          background: on ? "#F97B0C" : "#FFFDF8",
          color: "#101010",
          fontSize: 15,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
          opacity: busy ? 0.6 : 1,
          ...style,
        }}
      >
        {on ? "♥" : "♡"}
      </button>
      {prompt}
      </>
    );
  }

  return (
    <>
    <button
      onClick={click}
      aria-pressed={on}
      style={{
        flex: 1,
        minWidth: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "Anton, sans-serif",
        fontSize: 15,
        letterSpacing: "0.04em",
        background: on ? "#F97B0C" : "#F6F1E7",
        color: "#101010",
        border: "2px solid #101010",
        padding: "14px 18px",
        cursor: "pointer",
        opacity: busy ? 0.6 : 1,
        ...style,
      }}
    >
      {on ? "FAVORITED" : "FAVORITE"} <span style={{ fontSize: 16 }}>{on ? "♥" : "♡"}</span>
    </button>
    {prompt}
    </>
  );
}
