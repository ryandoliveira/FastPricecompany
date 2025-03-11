import React, { useState, useEffect } from "react";
import "../styles/WeatherAnimation.css"; // Certifique-se de que esse arquivo está corretamente configurado

const CLOUDY_TIME = 60; // Exemplo: 60 segundos para teste
const STORM_TIME = 60;  // Exemplo: 60 segundos para teste

function WeatherAnimation() {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [weather, setWeather] = useState("sunny"); // 'sunny', 'cloudy', 'storm'
  const [fade, setFade] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Mapeamento dos estados para os GIFs
  const gifUrls = {
    sunny: '../Pictures/sol.gif',
    cloudy: '../Pictures/chuva.gif',
    storm: '../Pictures/tempestade.gif'
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let newWeather = "sunny";
    if (timeElapsed >= STORM_TIME) {
      newWeather = "storm";
    } else if (timeElapsed >= CLOUDY_TIME) {
      newWeather = "cloudy";
    }
    if (newWeather !== weather) {
      setFade(true); // Ativa fade-out
      setTimeout(() => {
        setWeather(newWeather);
        setFade(false); // Ativa fade-in
        if (newWeather === "cloudy" || newWeather === "storm") {
          setShowPopup(true);
          setTimeout(() => {
            setShowPopup(false);
          }, 3000); // Exibe o popup por 3 segundos
        }
      }, 300); // Tempo de transição
    }
  }, [timeElapsed, weather]);

  const messages = {
    sunny: "Tempo limpo e ensolarado",
    cloudy: "Chuva a caminho",
    storm: "Chuvas intensas na sua região",
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="weather-container">
      <div className={`weather-icon ${weather}-icon ${fade ? "fade-out" : "fade-in"}`} />
      <div className={`weather-message ${fade ? "fade-out" : "fade-in"}`}>
        {messages[weather]}
      </div>
      <div className="timer">{formatTime(timeElapsed)}</div>
      {showPopup && (
        <div className="weather-popup">
          <div className="popup-content">
            <img
              src={gifUrls[weather]}
              alt={weather}
              className="popup-gif"
            />
            <h3>{messages[weather]}</h3>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeatherAnimation;
