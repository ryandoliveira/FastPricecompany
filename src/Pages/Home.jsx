// src/pages/Home.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../Components/Footer';
import TransportCard from '../Components/TransportCard';
import ImputForm from '../Components/ImputForm';
import Ubericon from '../Pictures/Ubericon.png';
import InDriveicon from '../Pictures/InDriveicon.png';
import novenoveicon from '../Pictures/novenoveicon.jpg';
import mockuporiginal from '../Pictures/mockuporiginal.png';
import dinheiroicon from '../Pictures/dinheiroicon.png';

// Função para converter um endereço em coordenadas [lon, lat] usando Nominatim
async function getCoordinates(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt-BR&q=${encodeURIComponent(address)}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data && data.length > 0) {
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  }
  throw new Error("Endereço não encontrado: " + address);
}

// Função para calcular a distância considerando a rota mais rápida (via OSRM)
async function getDrivingDistance(origin, destination) {
  try {
    const originCoords = await getCoordinates(origin);
    const destinationCoords = await getCoordinates(destination);
    // OSRM espera os pares no formato lon,lat separados por ponto-e-vírgula; usamos HTTPS
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[0]},${originCoords[1]};${destinationCoords[0]},${destinationCoords[1]}?overview=false`;
    const response = await fetch(osrmUrl);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OSRM API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const distanceMeters = data.routes[0].distance;
      const distanceKm = (distanceMeters / 1000).toFixed(2);
      return `${distanceKm} km`;
    }
    throw new Error("Nenhuma rota encontrada.");
  } catch (error) {
    throw new Error("Erro ao calcular a distância: " + error.message);
  }
}

function Home() {
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [distance, setDistance] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Atualiza os estados com os valores recebidos do ImputForm e calcula a distância
  const handleCompare = async (origin, destination) => {
    setOriginAddress(origin);
    setDestinationAddress(destination);
    try {
      const routeDistance = await getDrivingDistance(origin, destination);
      setDistance(routeDistance);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message);
      setDistance(null);
    }
  };

  const handleComparePrices = () => {
    console.log("Comparar preços para:");
    console.log("Origem:", originAddress);
    console.log("Destino:", destinationAddress);
    console.log("Distância:", distance);
    // Implemente a lógica de comparação de preços conforme necessário
  };

  return (
    <>
      {/* Seção 1: Herói */}
      <section className="section section-hero">
        <div className="content">
          <h1 className="company-name">FastPrice</h1>
          <p className="tagline">
            Encontre o melhor preço de transporte em um clique!
          </p>
        </div>
      </section>

      {/* Seção 2: Sobre a Empresa */}
      <section className="section section-about">
        <div className="about-container">
          <div className="about-image">
            <img src={dinheiroicon} alt="Dinheiro Icon" />
          </div>
          <div className="about-text">
            <h2>Sobre Nós</h2>
            <p>
              Na FastPrice, reunimos informações das principais plataformas de
              transporte, como <span className="highlight">Uber</span>,{' '}
              <span className="highlight">99</span> e{' '}
              <span className="highlight">InDrive</span>, para oferecer a você a
              melhor comparação de preços. Nosso objetivo é facilitar sua
              mobilidade e ajudar você a tomar a decisão mais vantajosa.
            </p>
          </div>
        </div>
      </section>

      {/* Seção 2.5: Destaque */}
      <section className="section section-highlight">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 highlight-image">
              <img src={mockuporiginal} alt="Destaque FastPrice" className="img-fluid" />
            </div>
            <div className="col-md-6 highlight-text">
              <h2 className="highlight-title">Sua Melhor Escolha em Transporte</h2>
              <h3 className="highlight-subtitle">
                Conectando você ao melhor preço e conforto
              </h3>
              <p>• Experiência inovadora e intuitiva para comparar opções.</p>
              <p>• Economia real com transparência e rapidez.</p>
              <p>• Facilidade na escolha da melhor opção para seu destino.</p>
              <p>• Confiança e segurança em cada corrida.</p>
              <div className="feedback-button-container text-center mt-5">
                <Link to="/feedbacks" className="btn btn-feedback animate__animated animate__fadeIn">
                  Ver Feedbacks
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3: Comparativo de Preços */}
      <section className="section section-pricing">
        <div className="content">
          <h2>Comparativo de Preços</h2>
          <div className="compare-area">
            <ImputForm onCompare={handleCompare} />
            {errorMessage && <p className="error">{errorMessage}</p>}
            {distance && (
              <div className="distance-area">
                <span className="distance-info">Distância: {distance}</span>
                <button className="compare-btn" onClick={handleComparePrices}>
                  Comparar Preços
                </button>
              </div>
            )}
          </div>
          <div className="card-container">
            <TransportCard 
              platform="Uber" 
              options={["UberX", "Uber Comfort", "UberBlack"]} 
              iconUrl={Ubericon}
            />
            <TransportCard 
              platform="99" 
              options={["99POP", "99Comfort", "99Taxi"]} 
              iconUrl={novenoveicon}
            />
            <TransportCard 
              platform="InDrive" 
              options={["InDrive"]} 
              iconUrl={InDriveicon}
            />
          </div>
        </div>
      </section>

      {/* Seção 4: Footer */}
      <section className="section section-footer">
        <Footer />
      </section>
    </>
  );
}

export default Home;
