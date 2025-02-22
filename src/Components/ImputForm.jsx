// src/Components/ImputForm.jsx
import React, { useState, useEffect } from 'react';

function ImputForm({ onCompare }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

  // Estilos inline para a lista de sugestões
  const suggestionsStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    listStyle: 'none',
    margin: '4px 0 0 0',
    padding: '4px 0',
  };
  
  const suggestionItemStyle = {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333333',
    transition: 'background-color 0.2s, color 0.2s',
    borderBottom: '1px solid #f0f0f0',
  };
  
  // Função auxiliar para buscar sugestões via Nominatim
  const fetchSuggestions = (query, setSuggestions) => {
    // Use um e‑mail válido para identificar sua aplicação (substitua pelo seu)
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=pt-BR&countrycodes=br&ryandoliveira@hotmail.com&q=${encodeURIComponent(query)}`;
    fetch(url, { mode: 'cors', headers: { 'Accept': 'application/json' } })
      .then((res) => res.json())
      .then((data) => setSuggestions(data))
      .catch((err) =>
        console.error('Erro no autocomplete:', err)
      );
  };

  // Busca sugestões para "Local de Partida" com debounce
  useEffect(() => {
    if (origin.trim().length >= 3) {
      const timer = setTimeout(() => {
        fetchSuggestions(origin.trim(), setOriginSuggestions);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setOriginSuggestions([]);
    }
  }, [origin]);

  // Busca sugestões para "Local de Destino" com debounce
  useEffect(() => {
    if (destination.trim().length >= 3) {
      const timer = setTimeout(() => {
        fetchSuggestions(destination.trim(), setDestinationSuggestions);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDestinationSuggestions([]);
    }
  }, [destination]);

  const handleOriginSelect = (suggestion) => {
    setOrigin(suggestion.display_name);
    setOriginSuggestions([]);
  };

  const handleDestinationSelect = (suggestion) => {
    setDestination(suggestion.display_name);
    setDestinationSuggestions([]);
  };

  // Na submissão, se houver sugestões e o valor digitado não corresponder exatamente,
  // utiliza a primeira sugestão como fallback.
  const handleSubmit = (e) => {
    e.preventDefault();
    let finalOrigin = origin;
    let finalDestination = destination;

    if (originSuggestions.length > 0) {
      const exactOrigin = originSuggestions.find(
        (s) => s.display_name.toLowerCase() === origin.trim().toLowerCase()
      );
      if (!exactOrigin) {
        finalOrigin = originSuggestions[0].display_name;
      }
    }
    if (destinationSuggestions.length > 0) {
      const exactDestination = destinationSuggestions.find(
        (s) => s.display_name.toLowerCase() === destination.trim().toLowerCase()
      );
      if (!exactDestination) {
        finalDestination = destinationSuggestions[0].display_name;
      }
    }
    if (onCompare) {
      onCompare(finalOrigin, finalDestination);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="imput-form">
      <div className="input-wrapper" style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Local de Partida"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
        {originSuggestions.length > 0 && (
          <ul className="autocomplete-suggestions" style={suggestionsStyle}>
            {originSuggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                onClick={() => handleOriginSelect(suggestion)}
                style={suggestionItemStyle}
              >
                {suggestion.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className="arrow-loader">&#8594;</span>
      <div className="input-wrapper" style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Local de Destino"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        {destinationSuggestions.length > 0 && (
          <ul className="autocomplete-suggestions" style={suggestionsStyle}>
            {destinationSuggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                onClick={() => handleDestinationSelect(suggestion)}
                style={suggestionItemStyle}
              >
                {suggestion.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit">Calcular</button>
    </form>
  );
}

export default ImputForm;
