import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { useLocation } from 'react-router-dom';
import Globe from 'react-globe.gl';
import 'leaflet/dist/leaflet.css';
import '../styles/Traffic.css';
import L from 'leaflet';

// Chaves de API: TomTom para dados de tráfego e Jawg para os tiles do mapa
const TOMTOM_API_KEY = '3YDGghXPQDfKIQU0JGnvCb2bKGGPyK2B'; // sua chave de tráfego
const JAWG_API_KEY = 'ZPF7gcpHO7h6ciXCjdt47BqLv6u1XhKrQSgUqVt69NUPGy7XvBAfjP4pHH2XDOVN';

// Ícones personalizados para os marcadores de origem e destino
const customMarkerIcon = new L.Icon({
  iconUrl: require('../Pictures/bonequinhomuitobrabo.gif'),
  iconSize: [58, 58],
  iconAnchor: [34, 58],
  popupAnchor: [0, -48],
});

const destinationMarkerIcon = new L.Icon({
  iconUrl: require('../Pictures/localization.gif'),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Componente para ajustar automaticamente os limites do mapa com base nas coordenadas da rota
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
  const [showGlobe, setShowGlobe] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  // Estado que controla o ponto de vista do globo para simular aproximação
  const [pointOfView, setPointOfView] = useState({ lat: 0, lng: 0, altitude: 5 });
  // Cache para os dados de tráfego (chave: "lat,lng" com 3 casas decimais)
  const trafficCache = useRef({});

  // Inicia o fade out do globo após 4 segundos e o esconde aos 5 segundos
  useEffect(() => {
    const timerFade = setTimeout(() => {
      setFadeOut(true);
    }, 4000);
    const timerHide = setTimeout(() => {
      setShowGlobe(false);
    }, 5000);
    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerHide);
    };
  }, []);

  // Obtém os parâmetros de origem e destino da URL
  const query = new URLSearchParams(location.search);
  const origin = query.get('origin');
  const destination = query.get('destination');

  // Função para buscar as coordenadas de um endereço usando a API do Nominatim
  const getCoordinates = async (address) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt-BR&q=${encodeURIComponent(address)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.length > 0) {
      // Retorna as coordenadas como [lat, lon]
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
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

          // Calcula o ponto médio entre os dois pontos para ajustar a visão do globo
          const midLat = (originCoords[0] + destinationCoords[0]) / 2;
          const midLng = (originCoords[1] + destinationCoords[1]) / 2;
          setPointOfView({ lat: midLat, lng: midLng, altitude: 0.8 });

          // 2) Obter a rota via OSRM (em formato GeoJSON)
          // OSRM espera [lon, lat], por isso as coordenadas são invertidas
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destinationCoords[1]},${destinationCoords[0]}?overview=full&geometries=geojson`;
          const res = await fetch(osrmUrl);
          const data = await res.json();

          if (data.routes && data.routes.length > 0) {
            // Define o tempo de viagem (em minutos)
            const durationSec = data.routes[0].duration;
            setTravelTime((durationSec / 60).toFixed(1));

            // Converte as coordenadas de [lon, lat] para [lat, lon]
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRouteCoords(coords);
            // Segmenta a rota para colorir os trechos conforme o tráfego
            fetchTrafficSegments(coords);
          } else {
            setError('Rota não encontrada.');
          }
        } catch (err) {
          console.error('Erro ao obter rota:', err);
          setError('Erro ao obter a rota.');
        }
      };

      // Segmenta a rota em até 100 partes para maior fidelidade – mesmo que isso gere muitas requisições
      const fetchTrafficSegments = async (coords) => {
        try {
          const segments = [];
          const MAX_SEGMENTS = 100;
          const SEGMENT_COUNT = Math.min(coords.length - 1, MAX_SEGMENTS);
          const chunkSize = (coords.length - 1) / SEGMENT_COUNT;
          for (let i = 0; i < SEGMENT_COUNT; i++) {
            const startIndex = Math.floor(i * chunkSize);
            const endIndex = (i === SEGMENT_COUNT - 1) ? coords.length - 1 : Math.floor((i + 1) * chunkSize);
            const segmentCoords = coords.slice(startIndex, endIndex + 1);
            if (segmentCoords.length < 2) continue;
            const color = await getSegmentTrafficColor(segmentCoords);
            segments.push({ coords: segmentCoords, color });
          }
          setTrafficSegments(segments);
        } catch (err) {
          console.error('Erro ao obter dados de tráfego:', err);
        }
      };

      // Para cada segmento, amostra 7 pontos (dividindo uniformemente o segmento) para determinar o pior cenário de tráfego
      const getSegmentTrafficColor = async (segmentCoords) => {
        try {
          const sampleCount = 7;
          const sampleIndices = [];
          const len = segmentCoords.length;
          for (let i = 0; i < sampleCount; i++) {
            sampleIndices.push(Math.floor((i / (sampleCount - 1)) * (len - 1)));
          }
          const ratios = await Promise.all(
            sampleIndices.map(idx => getTrafficRatio(segmentCoords[idx]))
          );
          const validRatios = ratios.filter(r => r !== null);
          const worstRatio = validRatios.length > 0 ? Math.min(...validRatios) : 1;
          if (worstRatio >= 0.95) return 'green';
          if (worstRatio >= 0.8) return 'yellow';
          return 'red';
        } catch (err) {
          console.error('Erro no getSegmentTrafficColor:', err);
          return 'gray';
        }
      };

      // Consulta a API TomTom para obter a razão de tráfego (currentSpeed / freeFlowSpeed)
      // Utiliza um cache simples com precisão de 3 casas decimais para evitar requisições redundantes
      const getTrafficRatio = async ([lat, lon]) => {
        try {
          const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
          if (trafficCache.current[key] !== undefined) {
            return trafficCache.current[key];
          }
          const trafficUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${lat},${lon}&key=${TOMTOM_API_KEY}`;
          const res = await fetch(trafficUrl);
          const data = await res.json();
          if (data && data.flowSegmentData) {
            const { currentSpeed, freeFlowSpeed } = data.flowSegmentData;
            const ratio = currentSpeed / freeFlowSpeed;
            trafficCache.current[key] = ratio;
            return ratio;
          }
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
      {showGlobe ? (
        <div className={`globe-container ${fadeOut ? 'fade-out' : ''}`}>
          <Globe
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundColor="#000000"
            atmosphereColor="#444444"
            atmosphereAltitude={0.25}
            autoRotate={true}
            autoRotateSpeed={0.1}
            pointOfView={pointOfView}
            transitionDuration={2000}
            onClick={() => setShowGlobe(false)}
          />
        </div>
      ) : (
        <>
          <div className="traffic-header">
            <h2>Trajeto: {origin} → {destination}</h2>
            {travelTime && <p className="travel-time">Tempo estimado: {travelTime} minutos</p>}
          </div>
          {error && <p className="traffic-error">{error}</p>}
          <div className="map-wrapper fade-in">
            <MapContainer
              center={routeCoords.length > 0 ? routeCoords[0] : [0, 0]}
              zoom={13}
              scrollWheelZoom={true}
              style={{ height: '100%' }}
            >
              <TileLayer
                url={`https://tile.jawg.io/jawg-streets/{z}/{x}/{y}{r}.png?access-token=${JAWG_API_KEY}`}
                attribution='&copy; <a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">Jawg Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                minZoom={0}
                maxZoom={22}
              />
              <MapBounds coords={routeCoords} />
              {routeCoords.length > 0 && (
                <Polyline pathOptions={{ color: 'blue' }} positions={routeCoords} />
              )}
              {trafficSegments.map((segment, idx) => (
                <Polyline
                  key={idx}
                  pathOptions={{ color: segment.color, weight: 5 }}
                  positions={segment.coords}
                />
              ))}
              <Marker position={routeCoords[0]} icon={customMarkerIcon}>
                <Popup>Origem</Popup>
              </Marker>
              <Marker position={routeCoords[routeCoords.length - 1]} icon={destinationMarkerIcon}>
                <Popup>Destino</Popup>
              </Marker>
            </MapContainer>
          </div>
        </>
      )}
    </div>
  );
}

export default Traffic;
