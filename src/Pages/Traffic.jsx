// src/Pages/Traffic.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { useLocation } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../styles/Traffic.css';
import L from 'leaflet';

const TOMTOM_API_KEY = 'sZrZpGbSOgR46GQJgh0XQzQHB5m74fMM'; // sua chave de tráfego

// Ícones personalizados usando GIFs da pasta Pictures para os marcadores
const customMarkerIcon = new L.Icon({
  iconUrl: require('../Pictures/bonequinhomuitobrabo.png'),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const destinationMarkerIcon = new L.Icon({
  iconUrl: require('../Pictures/localization.gif'),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Componente para ajustar automaticamente os limites do mapa
function MapBounds({ coords }) {
  const map = useMap();
  if (coords.length > 0) {
    map.fitBounds(coords);
  }
  return null;
}

function Traffic() {
  const location = useLocation();
  const [routeCoords, setRouteCoords] = useState([]);
  const [travelTime, setTravelTime] = useState(null);
  const [error, setError] = useState(null);
  const [trafficSegments, setTrafficSegments] = useState([]);

  // Lê os parâmetros de origem e destino da URL
  const query = new URLSearchParams(location.search);
  const origin = query.get('origin');
  const destination = query.get('destination');

  // Função para buscar as coordenadas de um endereço usando Nominatim
  const getCoordinates = async (address) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt-BR&q=${encodeURIComponent(address)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    }
    throw new Error('Endereço não encontrado: ' + address);
  };

  useEffect(() => {
    if (origin && destination) {
      const fetchRoute = async () => {
        try {
          // 1) Obter coordenadas de origem e destino
          const originCoords = await getCoordinates(origin);
          const destinationCoords = await getCoordinates(destination);

          // 2) Obter a rota via OSRM (em formato GeoJSON)
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[0]},${originCoords[1]};${destinationCoords[0]},${destinationCoords[1]}?overview=full&geometries=geojson`;
          const res = await fetch(osrmUrl);
          const data = await res.json();

          if (data.routes && data.routes.length > 0) {
            // Define o tempo de viagem (em minutos)
            const durationSec = data.routes[0].duration;
            setTravelTime((durationSec / 60).toFixed(1));

            // Converte as coordenadas de [lon, lat] para [lat, lon]
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRouteCoords(coords);
            // Segmenta a rota para colorir cada trecho conforme o trânsito
            fetchTrafficSegments(coords);
          } else {
            setError('Rota não encontrada.');
          }
        } catch (err) {
          console.error('Erro ao obter rota:', err);
          setError('Erro ao obter a rota.');
        }
      };

      // Função para segmentar a rota de forma que não haja lacunas entre os segmentos
      const fetchTrafficSegments = async (coords) => {
        try {
          const segments = [];
          // Define o número máximo de segmentos desejados.
          // Se a rota for muito curta, usaremos apenas um segmento.
          const SEGMENT_COUNT = Math.min(10, coords.length - 1);
          
          // Se não houver pontos suficientes para segmentar, usa toda a rota como um segmento
          if (SEGMENT_COUNT < 1) {
            const color = await getSegmentTrafficColor(coords);
            segments.push({ coords, color });
            setTrafficSegments(segments);
            return;
          }
          
          // Dividir a rota de forma contínua:
          // Usamos (coords.length - 1) para garantir que todos os trechos entre pontos sejam cobertos
          const chunkSize = (coords.length - 1) / SEGMENT_COUNT;
          for (let i = 0; i < SEGMENT_COUNT; i++) {
            // O início é o ponto atual e o fim é calculado de forma que não haja saltos
            const startIndex = Math.floor(i * chunkSize);
            // Garante que o último segmento inclui o último ponto
            const endIndex = i === SEGMENT_COUNT - 1 ? coords.length - 1 : Math.floor((i + 1) * chunkSize);
            // Incluímos o último ponto do segmento anterior para continuidade
            const segmentCoords = coords.slice(startIndex, endIndex + 1);
            // Se o segmento estiver vazio, pule-o (deve ocorrer raramente)
            if (segmentCoords.length < 2) continue;
            const color = await getSegmentTrafficColor(segmentCoords);
            segments.push({ coords: segmentCoords, color });
          }
          setTrafficSegments(segments);
        } catch (err) {
          console.error('Erro ao obter dados de tráfego:', err);
        }
      };

      // Para um conjunto de coordenadas de um segmento, consulta 3 pontos (início, meio e fim)
      // e retorna a cor baseada no pior (menor) ratio encontrado
      const getSegmentTrafficColor = async (segmentCoords) => {
        try {
          const sampleIndices = [0, Math.floor(segmentCoords.length / 2), segmentCoords.length - 1];
          let worstRatio = 1; // Inicia com o melhor ratio possível
          for (const idx of sampleIndices) {
            const ratio = await getTrafficRatio(segmentCoords[idx]);
            if (ratio !== null && ratio < worstRatio) {
              worstRatio = ratio;
            }
          }
          console.log('Segmento amostrado com worstRatio:', worstRatio);
          // Define os thresholds para a cor:
          if (worstRatio >= 0.95) return 'green';    // Muito bom
          if (worstRatio >= 0.8) return 'yellow';      // Moderado
          return 'red';                              // Ruim
        } catch (err) {
          console.error('Erro no getSegmentTrafficColor:', err);
          return 'gray';
        }
      };

      // Consulta a API da TomTom para um ponto e retorna o ratio (currentSpeed / freeFlowSpeed)
      const getTrafficRatio = async ([lat, lon]) => {
        try {
          const trafficUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${lat},${lon}&key=${TOMTOM_API_KEY}`;
          const res = await fetch(trafficUrl);
          const data = await res.json();
          if (data && data.flowSegmentData) {
            const { currentSpeed, freeFlowSpeed } = data.flowSegmentData;
            const ratio = currentSpeed / freeFlowSpeed;
            console.log(`Ponto [${lat}, ${lon}]: currentSpeed=${currentSpeed}, freeFlowSpeed=${freeFlowSpeed}, ratio=${ratio}`);
            return ratio;
          }
          console.log('Dados de tráfego não encontrados para', [lat, lon], data);
          return null;
        } catch (err) {
          console.error('Erro no getTrafficRatio:', err);
          return null;
        }
      };

      fetchRoute();
    }
  }, [origin, destination]);

  return (
    <div className="traffic-container">
      <div className="traffic-header">
        <h2>Trajeto: {origin} → {destination}</h2>
        {travelTime && <p className="travel-time">Tempo estimado: {travelTime} minutos</p>}
      </div>
      {error && <p className="traffic-error">{error}</p>}
      <div className="map-wrapper fade-in">
        <MapContainer
          center={routeCoords.length > 0 ? routeCoords[0] : [-23.55052, -46.633308]}
          zoom={13}
          className="leaflet-container"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Ajusta automaticamente os limites do mapa para incluir toda a rota */}
          <MapBounds coords={routeCoords} />
          {/* Desenha cada segmento da rota com a cor definida */}
          {trafficSegments.map((segment, idx) => (
            <Polyline key={idx} positions={segment.coords} color={segment.color} weight={6} />
          ))}
          {/* Marcadores de início e fim */}
          {routeCoords.length > 0 && (
            <>
              <Marker position={routeCoords[0]} icon={customMarkerIcon}>
                <Popup>Início: {origin}</Popup>
              </Marker>
              <Marker position={routeCoords[routeCoords.length - 1]} icon={destinationMarkerIcon}>
                <Popup>Destino: {destination}</Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

export default Traffic;
