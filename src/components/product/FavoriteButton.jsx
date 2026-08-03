import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useFavorites } from "../../hooks/useFavorites";

// The heart. Favorites are account-tied, so a signed-out tap routes to sign-in
// with a return path rather than silently doing nothing.
// `variant`: "full" = the PDP's labelled button, "icon" = the corner heart on a card.
export default function FavoriteButton({ slug, variant = "full", style }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const [busy, setBusy] = useState(false);
  const on = isFavorite(slug);

  const click = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // cards wrap this in a link
    if (!user) {
      navigate(`/sign-in?return=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      await toggle(slug);
    } finally {
      setBusy(false);
    }
  };

  if (variant === "icon") {
    return (
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
    );
  }

  return (
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
  );
}
