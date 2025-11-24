"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, ExternalLink, TrendingUp, DollarSign, Tag, ChevronDown } from "lucide-react";

interface NewsItem {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  banner_image: string;
  source: string;
  category_within_source?: string;
  source_domain: string;
  topics?: {
    topic: string;
    relevance_score: string;
  }[];
  ticker_sentiment?: {
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }[];
  overall_sentiment_label: string;
}

type NewsTab = 'market' | 'ticker' | 'topics';

export default function NewsSection() {
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [displayedNews, setDisplayedNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NewsTab>('market');
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [selectedTopic, setSelectedTopic] = useState('technology');
  const [itemsToShow, setItemsToShow] = useState(9);
  const [showViewMoreTop, setShowViewMoreTop] = useState(false);

  const allowedDomains = [
    "www.benzinga.com",
    "cdn.snapi.dev",
    "static.alphavantage.co",
    "g.foolcdn.com",
    "cdn.i-scmp.com",
    "img.i-scmp.com",
    "cdn.benzinga.com",
    "s3.cointelegraph.com",
  ];

  const popularTickers = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX'];
  const popularTopics = ['technology', 'finance', 'economy_macro', 'blockchain', 'earnings', 'ipo', 'mergers_and_acquisitions'];

  // Efecto para cargar las noticias
  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/news", { cache: "no-store" });
        const data = await res.json();
        
        // Usar data.feed o data.items dependiendo de la respuesta de la API
        
        const newsData = data.feed || [];
        setAllNews(newsData);
        
        // Mostrar View More arriba si hay más de 9 items
        //   setNews(data.feed || []); // dejar para produccion
        setShowViewMoreTop(newsData.length > 9);
        
      } catch (err) {
        console.error("Error cargando noticias:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  // Efecto para aplicar filtros y paginación
  useEffect(() => {
    if (allNews.length === 0) return;

    let filteredNews = [...allNews];

    // Aplicar filtros según la pestaña activa
    switch (activeTab) {
      case 'ticker':
        // Filtrar noticias que contengan el ticker seleccionado
        filteredNews = filteredNews.filter(item => 
          item.ticker_sentiment?.some(ticker => 
            ticker.ticker === selectedTicker
          )
        );
        break;
      
      case 'topics':
        // Filtrar noticias que contengan el tema seleccionado
        filteredNews = filteredNews.filter(item =>
          item.topics?.some(topic =>
            topic.topic.toLowerCase().includes(selectedTopic.toLowerCase())
          )
        );
        break;
      
      case 'market':
      default:
        // No aplicar filtro adicional para mercado
        break;
    }

    // Aplicar paginación
    setDisplayedNews(filteredNews.slice(0, itemsToShow));

  }, [allNews, activeTab, selectedTicker, selectedTopic, itemsToShow]);

  // Función para cargar más noticias
  const loadMoreNews = () => {
    setItemsToShow(prev => prev + 6);
  };

  // Función para formatear fecha
  const formatTime = (timeString: string) => {
    try {
      const formatted = timeString.replace(
        /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
        "$1-$2-$3T$4:$5:$6Z"
      );
      return new Date(formatted).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return new Date(timeString).toLocaleDateString();
    }
  };

  // Función para obtener color de sentimiento
  const getSentimentColor = (sentiment: string) => {
    if (sentiment.includes("Bullish")) return "bg-green-500/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800";
    if (sentiment.includes("Bearish")) return "bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
    return "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700";
  };

  // Función para obtener punto de sentimiento
  const getSentimentDot = (score?: string) => {
    if (!score) return "bg-gray-400";
    const numScore = parseFloat(score);
    if (numScore > 0.1) return "bg-green-500";
    if (numScore < -0.1) return "bg-red-500";
    return "bg-yellow-500";
  };

  // Calcular si hay más noticias por cargar
  const hasMoreNews = useMemo(() => {
    let filteredCount = allNews.length;
    
    switch (activeTab) {
      case 'ticker':
        filteredCount = allNews.filter(item => 
          item.ticker_sentiment?.some(ticker => ticker.ticker === selectedTicker)
        ).length;
        break;
      case 'topics':
        filteredCount = allNews.filter(item =>
          item.topics?.some(topic =>
            topic.topic.toLowerCase().includes(selectedTopic.toLowerCase())
          )
        ).length;
        break;
    }
    
    return itemsToShow < filteredCount;
  }, [allNews, activeTab, selectedTicker, selectedTopic, itemsToShow]);

  // Contador total de noticias filtradas
  const totalFilteredNews = useMemo(() => {
    switch (activeTab) {
      case 'ticker':
        return allNews.filter(item => 
          item.ticker_sentiment?.some(ticker => ticker.ticker === selectedTicker)
        ).length;
      case 'topics':
        return allNews.filter(item =>
          item.topics?.some(topic =>
            topic.topic.toLowerCase().includes(selectedTopic.toLowerCase())
          )
        ).length;
      default:
        return allNews.length;
    }
  }, [allNews, activeTab, selectedTicker, selectedTopic]);

  return (
    <section
      id="news"
      className="py-24 border-t border-border bg-background text-foreground transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-6 space-y-14">
        {/* ===== Header ===== */}
        <div className="text-center space-y-4">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--amarillo-principal)] to-[var(--amarillo-principal)]/80 bg-clip-text text-transparent"
          >
            Noticias del Mercado
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Mantente informado con los acontecimientos financieros, bursátiles y tecnológicos más recientes.
            {totalFilteredNews > 0 && (
              <span className="block text-sm text-[var(--amarillo-principal)] mt-2">
                {totalFilteredNews} noticias disponibles
              </span>
            )}
          </motion.p>
        </div>

        {/* ===== Sistema de Tabs ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card border border-border rounded-lg shadow-sm"
        >
          {/* Navegación de Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: 'market' as NewsTab, label: 'Mercado', icon: TrendingUp },
              { id: 'ticker' as NewsTab, label: 'Por Ticker', icon: DollarSign },
              { id: 'topics' as NewsTab, label: 'Por Temas', icon: Tag }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setItemsToShow(6);
                  }}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-[var(--amarillo-principal)] border-b-2 border-[var(--amarillo-principal)] bg-[var(--amarillo-principal)]/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Contenido de Tabs */}
          <div className="p-6">
            {/* Panel Mercado */}
            {activeTab === 'market' && (
              <div className="text-center py-2">
                <p className="text-muted-foreground">
                  Noticias generales del mercado financiero global
                </p>
                {totalFilteredNews > 0 && (
                  <p className="text-sm text-[var(--amarillo-principal)] mt-2">
                    Mostrando {Math.min(itemsToShow, totalFilteredNews)} de {totalFilteredNews} noticias
                  </p>
                )}
              </div>
            )}

            {/* Panel Ticker */}
            {activeTab === 'ticker' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-foreground">
                  Selecciona un ticker:
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTickers.map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => {
                        setSelectedTicker(ticker);
                        setItemsToShow(6);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedTicker === ticker
                          ? 'bg-[var(--amarillo-principal)] text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                      }`}
                    >
                      {ticker}
                    </button>
                  ))}
                  <input
                    type="text"
                    placeholder="Otro ticker..."
                    className="px-4 py-2 border border-border rounded-full text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--amarillo-principal)] focus:border-transparent placeholder:text-muted-foreground"
                    onBlur={(e) => {
                      if (e.target.value) {
                        setSelectedTicker(e.target.value.toUpperCase());
                        setItemsToShow(6);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        setSelectedTicker(e.currentTarget.value.toUpperCase());
                        setItemsToShow(6);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
                {totalFilteredNews > 0 && (
                  <p className="text-sm text-[var(--amarillo-principal)]">
                    {totalFilteredNews} noticias para {selectedTicker}
                  </p>
                )}
              </div>
            )}

            {/* Panel Temas */}
            {activeTab === 'topics' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-foreground">
                  Selecciona un tema:
                </label>
                <div className="flex flex-wrap gap-2">
                  {popularTopics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setSelectedTopic(topic);
                        setItemsToShow(6);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedTopic === topic
                          ? 'bg-[var(--amarillo-principal)] text-primary-foreground shadow-md'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                      }`}
                    >
                      {topic.replace(/_/g, ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
                {totalFilteredNews > 0 && (
                  <p className="text-sm text-[var(--amarillo-principal)]">
                    {totalFilteredNews} noticias sobre {selectedTopic.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* ===== Botón Ver Más (Arriba) - Solo si hay más de 9 noticias ===== */}
        {showViewMoreTop && hasMoreNews && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-center"
          >
            <Button
              onClick={loadMoreNews}
              variant="outline"
              className="border-[var(--amarillo-principal)] text-[var(--amarillo-principal)] hover:bg-[var(--amarillo-principal)] hover:text-primary-foreground transition-all duration-200"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver más noticias ({totalFilteredNews - itemsToShow} restantes)
            </Button>
          </motion.div>
        )}

        {/* ===== Grid de Noticias ===== */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin w-10 h-10 text-muted-foreground" />
          </div>
        ) : (
          <div className="relative">
            {/* Estado vacío */}
            {displayedNews.length === 0 && !loading && (
              <div className="text-center py-16">
                <div className="text-muted-foreground text-lg mb-4">
                  No se encontraron noticias
                </div>
                <Button
                  onClick={() => {
                    setActiveTab('market');
                    setItemsToShow(6);
                  }}
                  variant="outline"
                  className="border-[var(--amarillo-principal)] text-[var(--amarillo-principal)]"
                >
                  Volver a noticias generales
                </Button>
              </div>
            )}

            {/* Grid de noticias - SIN ANIMACIONES PROBLEMÁTICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedNews.map((item, i) => {
                const imageUrl = item.banner_image;
                let hostname = "";

                try {
                  if (imageUrl) hostname = new URL(imageUrl).hostname;
                } catch (error) {
                  console.warn("❌ URL inválida:", imageUrl, error);
                }

                // 🔹 Excluir imágenes no permitidas
                if (imageUrl && !allowedDomains.includes(hostname)) {
                  return null;
                }

                return (
                  // ❌ ELIMINAR motion.div y usar div simple
                  <div key={`${item.url}-${i}`} className="group">
                    <Card className="overflow-hidden flex flex-col border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300 h-full group-hover:scale-[1.02]">
                      {/* Imagen */}
                      {item.banner_image && (
                        <div className="relative w-full h-44 overflow-hidden">
                          <Image
                            src={item.banner_image}
                            alt={item.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                      )}

                      {/* Contenido */}
                      <CardHeader className="space-y-3 p-5 border-b border-border/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--amarillo-principal)] bg-[var(--amarillo-principal)]/10 px-2 py-1 rounded">
                            {item.source}
                          </span>
                          <time className="text-xs text-muted-foreground">
                            {formatTime(item.time_published)}
                          </time>
                        </div>

                        <h3 className="text-lg font-semibold leading-tight line-clamp-2 text-foreground group-hover:text-[var(--amarillo-principal)] transition-colors">
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {item.title}
                          </a>
                        </h3>

                        {/* Topics */}
                        {item.topics && item.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.topics.slice(0, 2).map((topic, index) => (
                              <span
                                key={index}
                                className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
                              >
                                {topic.topic.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardHeader>

                      <CardContent className="flex flex-col flex-1 justify-between p-5 space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {item.summary}
                        </p>

                        {/* Ticker Sentiment */}
                        {item.ticker_sentiment && item.ticker_sentiment.length > 0 && (
                          <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                            <div className="flex flex-wrap gap-2">
                              {item.ticker_sentiment.slice(0, 3).map((ticker, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  <span className="text-xs font-medium text-foreground">
                                    {ticker.ticker}
                                  </span>
                                  <div
                                    className={`w-2 h-2 rounded-full ${getSentimentDot(ticker.ticker_sentiment_score)}`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Overall Sentiment y Botón */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/40">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getSentimentColor(item.overall_sentiment_label)}`}>
                            {item.overall_sentiment_label}
                          </span>

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-border/50 hover:border-[var(--amarillo-principal)]/50 hover:text-[var(--amarillo-principal)] transition-all duration-200"
                          >
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs"
                            >
                              Leer más
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>

            {/* ===== Botón Ver Más (Abajo) ===== */}
            {hasMoreNews && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex justify-center mt-12"
              >
                <Button
                  onClick={loadMoreNews}
                  variant="outline"
                  size="lg"
                  className="border-[var(--amarillo-principal)] text-[var(--amarillo-principal)] hover:bg-[var(--amarillo-principal)] hover:text-primary-foreground transition-all duration-200 px-8 py-3"
                >
                  <ChevronDown className="w-5 h-5 mr-2" />
                  Ver más noticias ({totalFilteredNews - itemsToShow} restantes)
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}