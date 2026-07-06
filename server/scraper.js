// scraper.js
const axios = require("axios");
const cheerio = require("cheerio");

// Configuração do Browserless
const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;
const BROWSERLESS_URL = `https://chrome.browserless.io/content?token=${BROWSERLESS_API_KEY}`;

// Função auxiliar para fazer scraping via Browserless
async function fetchHTML(url) {
  try {
    const response = await axios.post(BROWSERLESS_URL, {
      url: url,
      options: {
        waitForSelector:
          ".product-tile-pd, .product, .product-grid, #search-results, .productList__grid__item",
        waitForTimeout: 10000,
        scrollPage: true,
        scrollDelay: 1000,
        scrollTimes: 3,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Erro ao buscar HTML via Browserless:", error.message);
    throw error;
  }
}

// ============ PINGO DOCE ============
async function scraper_PingoDoce(pagina, pesquisa) {
  const startTime = Date.now();

  try {
    const url = `${pagina}?s=${encodeURIComponent(pesquisa)}`;
    console.log(`Buscando: ${url}`);

    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Verifica se encontrou produtos
    const resultText = $(".search-results-container-count").text();
    const resultCount = parseInt(resultText, 10) || 0;

    if (resultCount === 0) {
      return {
        success: false,
        message: "Nenhum produto encontrado para a pesquisa.",
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
      };
    }

    const products = [];
    $(".product-tile-pd").each((index, element) => {
      const name =
        $(element).find(".product-name-link a").text().trim() || "ERROR";

      let price = "N/A";
      const priceBruto = $(element).find(".value").attr("content");
      if (priceBruto) {
        price = priceBruto.replace(/\./g, ",") + "€";
      }

      const image =
        $(element).find(".product-tile-image-link img").attr("src") || "ERROR";
      const urldoproduto =
        $(element).find(".product-name-link a").attr("href") || "ERROR";

      products.push({ name, price, image, urldoproduto });
    });

    console.log(`Pingo Doce: ${products.length} produtos encontrados`);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      search: {
        term: pesquisa,
        url: pagina,
      },
      summary: {
        total_products: products.length,
        execution_time_ms: Date.now() - startTime,
      },
      products: products,
    };
  } catch (error) {
    console.error("Erro no scraper_PingoDoce:", error.message);
    return {
      success: false,
      message: "Erro ao executar scraper",
      error: error.message,
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
    };
  }
}

// ============ CONTINENTE ============
async function scraper_Continente(pagina, pesquisa) {
  const startTime = Date.now();

  try {
    const url = `${pagina}?q=${encodeURIComponent(pesquisa)}`;
    console.log(`Buscando: ${url}`);

    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Verifica se encontrou produtos
    if ($(".search-noresults-wrapper").length > 0) {
      return {
        success: false,
        message: "Nenhum produto encontrado para a pesquisa.",
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
      };
    }

    const products = [];
    $("div[class='product']").each((index, element) => {
      const name =
        $(element).find(".pwc-tile--description").text().trim() || "ERROR";
      const image = $(element).find(".ct-tile-image").attr("src") || "ERROR";

      let price = "N/A";
      const priceSpan = $(element).find(".pwc-tile--price-primary");
      if (priceSpan.length > 0) {
        const integerPart = priceSpan.contents().first().text().trim();
        const decimalPart = priceSpan.find(".decimalPrice").text();
        if (integerPart && decimalPart) {
          price = integerPart + decimalPart;
        }
      }

      const urldoproduto =
        $(element).find(".ct-pdp-link a").attr("href") || "ERROR";

      products.push({ name, price, image, urldoproduto });
    });

    console.log(`Continente: ${products.length} produtos encontrados`);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      search: {
        term: pesquisa,
        url: pagina,
      },
      summary: {
        total_products: products.length,
        execution_time_ms: Date.now() - startTime,
      },
      products: products,
    };
  } catch (error) {
    console.error("Erro no scraper_Continente:", error.message);
    return {
      success: false,
      message: "Erro ao executar scraper",
      error: error.message,
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
    };
  }
}

// ============ AUCHAN ============
async function scraper_Auchan(pagina, pesquisa) {
  const startTime = Date.now();

  try {
    const url = `${pagina}?q=${encodeURIComponent(pesquisa)}`;
    console.log(`Buscando: ${url}`);

    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Verifica se encontrou produtos
    if ($(".auc-noresults__error--message").length > 0) {
      return {
        success: false,
        message: "Nenhum produto encontrado para a pesquisa.",
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
      };
    }

    const products = [];
    $(".product").each((index, element) => {
      const image = $(element).find(".tile-image").attr("src") || "ERROR";

      // Filtra produtos inválidos
      if (image.includes("pesquisa?search-button=&q")) return;

      const name = $(element).find(".link").text().trim() || "ERROR";

      let price = "N/A";
      const priceBruto = $(element).find(".sales span.value").attr("content");
      if (priceBruto) {
        price = priceBruto.replace(/\./g, ",") + "€";
      }

      const urldoproduto = $(element).find(".link").attr("href") || "ERROR";

      products.push({ name, price, image, urldoproduto });
    });

    console.log(`Auchan: ${products.length} produtos encontrados`);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      search: {
        term: pesquisa,
        url: pagina,
      },
      summary: {
        total_products: products.length,
        execution_time_ms: Date.now() - startTime,
      },
      products: products,
    };
  } catch (error) {
    console.error("Erro no scraper_Auchan:", error.message);
    return {
      success: false,
      message: "Erro ao executar scraper",
      error: error.message,
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
    };
  }
}

// ============ LIDL ============
async function scraper_lidl(pagina, pesquisa) {
  const startTime = Date.now();

  try {
    const url = `${pagina}?q=${encodeURIComponent(pesquisa)}`;
    console.log(`Buscando: ${url}`);

    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Verifica se encontrou produtos
    if ($(".s-products-not-found-message-wrapper").length > 0) {
      return {
        success: false,
        message: "Nenhum produto encontrado para a pesquisa.",
        timestamp: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
      };
    }

    const products = [];
    $(".product-grid-box").each((index, element) => {
      const brand =
        $(element).find(".product-grid-box__brand").text().trim() || "";
      const title =
        $(element).find(".product-grid-box__title").text().trim() || "";
      const name = brand + (brand && title ? " " : "") + title || "ERROR";

      let price = "N/A";
      const priceBruto = $(element).find(".ods-price__value").html();
      if (priceBruto) {
        price = priceBruto.replace(/\./g, ",") + "€";
      }

      const image =
        $(element).find(".odsc-image-gallery__image").attr("src") || "ERROR";
      const urldoproduto =
        $(element).find(".odsc-tile__link").attr("href") || "ERROR";

      products.push({ name, price, image, urldoproduto });
    });

    console.log(`Lidl: ${products.length} produtos encontrados`);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      search: {
        term: pesquisa,
        url: pagina,
      },
      summary: {
        total_products: products.length,
        execution_time_ms: Date.now() - startTime,
      },
      products: products,
    };
  } catch (error) {
    console.error("Erro no scraper_lidl:", error.message);
    return {
      success: false,
      message: "Erro ao executar scraper",
      error: error.message,
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
    };
  }
}

// ============ INTERMARCHÉ ============
async function scraper_Intermarche(pagina, pesquisa) {
  const startTime = Date.now();

  try {
    // URL do Intermarché é um pouco diferente
    const url = `${pagina}?q=${encodeURIComponent(pesquisa)}`;
    console.log(`Buscando: ${url}`);

    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    const products = [];
    $(".productList__grid__item").each((index, element) => {
      const name =
        $(element).find(".product__brand").text().trim() ||
        $(element).find(".product-name-link").text().trim() ||
        "ERROR";

      let price = "N/A";
      const priceBruto = $(element).attr("data-price");
      if (priceBruto) {
        price = priceBruto.replace(/\./g, ",") + "€";
      }

      const image =
        $(element).find(".image.product__image.no-flag").attr("src") || "ERROR";

      products.push({ name, price, image });
    });

    console.log(`Intermarché: ${products.length} produtos encontrados`);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      search: {
        term: pesquisa,
        url: pagina,
      },
      summary: {
        total_products: products.length,
        execution_time_ms: Date.now() - startTime,
      },
      products: products,
    };
  } catch (error) {
    console.error("Erro no scraper_Intermarche:", error.message);
    return {
      success: false,
      message: "Erro ao executar scraper",
      error: error.message,
      timestamp: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
    };
  }
}

module.exports = {
  scraper_PingoDoce,
  scraper_Continente,
  scraper_Auchan,
  scraper_lidl,
  scraper_Intermarche,
};
