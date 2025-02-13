// src/Components/ImputForm.jsx
import React, { useState } from 'react';

function ImputForm({ onCompare }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onCompare) {
      onCompare(origin, destination);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="imput-form">
      <div className="input-group">
        <label htmlFor="origin">Local de Partida:</label>
        <input
          id="origin"
          type="text"
          placeholder="Digite seu endereço atual"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
      </div>
      <div className="input-group">
        <label htmlFor="destination">Destino:</label>
        <input
          id="destination"
          type="text"
          placeholder="Digite seu endereço de destino"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>
      <button type="submit">Calcular Distância</button>
    </form>
  );
}

export default ImputForm;
