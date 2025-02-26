// src/Components/ImputForm.jsx
import React, { useState, useEffect } from 'react';

// Função que tenta extrair rua e numeração do input (opcional)
function parseStreetAndNumber(query) {
  const match = query.match(/^(.*?)[,\s]+(\d+)$/);
  if (match) {
    return { street: match[1].trim(), number: match[2].trim() };
  }
  return { street: query, number: '' };
}

// Formata o endereço completo usando os dados retornados do OSM
const formatAddress = (suggestion) => {
  if (suggestion.address) {
    const road = suggestion.address.road || "";
    const houseNumber = suggestion.address.house_number || "";
    const neighborhood = suggestion.address.suburb || suggestion.address.neighbourhood || "";
    const state = suggestion.address.state || "";
    const parts = [];
    if (road) parts.push(road);
    if (houseNumber) parts.push(houseNumber);
    if (neighborhood) parts.push(neighborhood);
    if (state) parts.push(state);
    return parts.join(', ');
  }
  return suggestion.display_name;
};

// Formata o endereço sem a numeração (para armazenar a base, se necessário)
const formatAddressWithoutNumber = (suggestion) => {
  if (suggestion.address) {
    const road = suggestion.address.road || "";
    const neighborhood = suggestion.address.suburb || suggestion.address.neighbourhood || "";
    const state = suggestion.address.state || "";
    const parts = [];
    if (road) parts.push(road);
    if (neighborhood) parts.push(neighborhood);
    if (state) parts.push(state);
    return parts.join(', ');
  }
  return suggestion.display_name;
};

function ImputForm({ onCompare }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  
  // Estados para controlar a necessidade de numeração manual
  const [originNeedsManual, setOriginNeedsManual] = useState(false);
  const [destinationNeedsManual, setDestinationNeedsManual] = useState(false);
  const [originBase, setOriginBase] = useState('');
  const [destinationBase, setDestinationBase] = useState('');
  const [originManual, setOriginManual] = useState('');
  const [destinationManual, setDestinationManual] = useState('');
  
  // Estados para controlar o hover (estilização)
  const [hoveredOriginIndex, setHoveredOriginIndex] = useState(-1);
  const [hoveredDestinationIndex, setHoveredDestinationIndex] = useState(-1);
  
  // Estados para armazenar o último valor selecionado (para evitar buscas repetidas)
  const [originLastSelected, setOriginLastSelected] = useState('');
  const [destinationLastSelected, setDestinationLastSelected] = useState('');
  
  // Estilos para a lista de sugestões
  const suggestionsStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    listStyle: 'none',
    margin: '4px 0 0 0',
    padding: '4px 0'
  };

  const suggestionItemStyle = {
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background-color 0.2s, color 0.2s'
  };

  const suggestionItemHoverStyle = {
    backgroundColor: '#f0f8ff',
    color: '#000'
  };

  // Função para buscar sugestões usando Nominatim (consulta livre)
  const fetchSuggestions = (query, setSuggestions) => {
    const emailParam = "ryandoliveira@hotmail.com"; // Substitua por um e‑mail válido
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=pt-BR&countrycodes=br&email="
      + encodeURIComponent(emailParam)
      + "&q="
      + encodeURIComponent(query);
    console.log("URL gerada:", url);
    fetch(url, { mode: 'cors', headers: { 'Accept': 'application/json' } })
      .then((res) => res.json())
      .then((data) => setSuggestions(data))
      .catch((err) => console.error('Erro no autocomplete:', err));
  };

  // Debounce para "Local de Partida" – só busca se o texto mudou em relação ao último selecionado
  useEffect(() => {
    if (origin.trim().length >= 3 && origin.trim() !== originLastSelected) {
      const timer = setTimeout(() => {
        fetchSuggestions(origin.trim(), setOriginSuggestions);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setOriginSuggestions([]);
    }
  }, [origin, originLastSelected]);

  // Debounce para "Local de Destino"
  useEffect(() => {
    if (destination.trim().length >= 3 && destination.trim() !== destinationLastSelected) {
      const timer = setTimeout(() => {
        fetchSuggestions(destination.trim(), setDestinationSuggestions);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDestinationSuggestions([]);
    }
  }, [destination, destinationLastSelected]);

  const handleOriginSelect = (suggestion) => {
    if (suggestion.address && !suggestion.address.house_number) {
      // Se não há numeração, solicita inserção manual
      const base = formatAddressWithoutNumber(suggestion);
      setOriginBase(base);
      setOriginNeedsManual(true);
      setOrigin(base);
      setOriginLastSelected(base);
    } else {
      const formatted = formatAddress(suggestion);
      setOrigin(formatted);
      setOriginNeedsManual(false);
      setOriginManual('');
      setOriginLastSelected(formatted);
    }
    setOriginSuggestions([]);
  };

  const handleDestinationSelect = (suggestion) => {
    if (suggestion.address && !suggestion.address.house_number) {
      const base = formatAddressWithoutNumber(suggestion);
      setDestinationBase(base);
      setDestinationNeedsManual(true);
      setDestination(base);
      setDestinationLastSelected(base);
    } else {
      const formatted = formatAddress(suggestion);
      setDestination(formatted);
      setDestinationNeedsManual(false);
      setDestinationManual('');
      setDestinationLastSelected(formatted);
    }
    setDestinationSuggestions([]);
  };

  const handleOriginManualChange = (e) => {
    const num = e.target.value;
    setOriginManual(num);
    setOrigin(originBase + (num ? ", " + num : ""));
    setOriginLastSelected(originBase + (num ? ", " + num : ""));
  };

  const handleDestinationManualChange = (e) => {
    const num = e.target.value;
    setDestinationManual(num);
    setDestination(destinationBase + (num ? ", " + num : ""));
    setDestinationLastSelected(destinationBase + (num ? ", " + num : ""));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onCompare) {
      onCompare(origin, destination);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="imput-form">
      {/* Campo de Partida */}
      <div className="input-wrapper" style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Local de Partida"
          value={origin}
          onChange={(e) => {
            setOrigin(e.target.value);
            setOriginNeedsManual(false);
          }}
        />
        {originSuggestions.length > 0 && (
          <ul className="autocomplete-suggestions" style={suggestionsStyle}>
            {originSuggestions.map((suggestion, index) => (
              <li
                key={suggestion.place_id}
                onMouseEnter={() => setHoveredOriginIndex(index)}
                onMouseLeave={() => setHoveredOriginIndex(-1)}
                onClick={() => handleOriginSelect(suggestion)}
                style={
                  hoveredOriginIndex === index
                    ? { ...suggestionItemStyle, ...suggestionItemHoverStyle }
                    : suggestionItemStyle
                }
              >
                {formatAddress(suggestion)}
              </li>
            ))}
          </ul>
        )}
        {originNeedsManual && (
          <input
            type="text"
            placeholder="Número"
            value={originManual}
            onChange={handleOriginManualChange}
            style={{ marginTop: '4px', padding: '6px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
          />
        )}
      </div>
      <span className="arrow-loader">&#8594;</span>
      {/* Campo de Destino */}
      <div className="input-wrapper" style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Local de Destino"
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            setDestinationNeedsManual(false);
          }}
        />
        {destinationSuggestions.length > 0 && (
          <ul className="autocomplete-suggestions" style={suggestionsStyle}>
            {destinationSuggestions.map((suggestion, index) => (
              <li
                key={suggestion.place_id}
                onMouseEnter={() => setHoveredDestinationIndex(index)}
                onMouseLeave={() => setHoveredDestinationIndex(-1)}
                onClick={() => handleDestinationSelect(suggestion)}
                style={
                  hoveredDestinationIndex === index
                    ? { ...suggestionItemStyle, ...suggestionItemHoverStyle }
                    : suggestionItemStyle
                }
              >
                {formatAddress(suggestion)}
              </li>
            ))}
          </ul>
        )}
        {destinationNeedsManual && (
          <input
            type="text"
            placeholder="Número"
            value={destinationManual}
            onChange={handleDestinationManualChange}
            style={{ marginTop: '4px', padding: '6px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
          />
        )}
      </div>
      <button type="submit">Calcular</button>
    </form>
  );
}

export default ImputForm;
