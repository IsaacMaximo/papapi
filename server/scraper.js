const BROWSERLESS_URL =
  "wss://production-sfo.browserless.io?token=2Uq0NqfU2OfmBd14ff28ddd83e274f38cb653424eae972cc1";

async function getPuppeteer() {
  const puppeteerModule = await import("puppeteer");
  return puppeteerModule.default;
}

async function connectBrowserless() {
  const puppeteer = await getPuppeteer();
  return await puppeteer.connect({
    browserWSEndpoint: BROWSERLESS_URL,
    defaultViewport: null,
    // Adicione timeout para evitar problemas
    timeout: 30000,
  });
}

async function testebrowserless(pagina) {
  const response = await fetch(
    "https://production-sfo.browserless.io/scrape?token=2Uq0NqfU2OfmBd14ff28ddd83e274f38cb653424eae972cc1",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: pagina,
        elements: [{ selector: "h1" }],
      }),
    },
  );
  const data = await response.json();
  console.log(data);
  return data;
}

async function scraper_PingoDoce(pagina, pesquisa) {
  const browser = await connectBrowserless();
  const page = await browser.newPage();

  const startTime = Date.now();

  await page.goto(pagina);

  const title = await page.title();
  console.log("Título da página:", title);

  const searchSelector = "input[name='q']";
  await page.waitForSelector(searchSelector);
  console.log("Campo de pesquisa encontrado. Realizando busca...");
  await page.type(searchSelector, pesquisa);
  console.log(`Texto digitado no campo de pesquisa: ${pesquisa}`);
  await page.keyboard.press("Enter");
  console.log(`Realizando pesquisa por: ${pesquisa}`);
  await page.waitForNavigation({ waitUntil: "networkidle0" });
  console.log("Pesquisa concluída. Página de resultados carregada.");

  const resultText = await page.$eval(
    ".search-results-container-count",
    (el) => el.innerText,
  );
  const resultCount = parseInt(resultText, 10);

  if (resultCount === 0) {
    console.log("Nenhum produto encontrado para a pesquisa.");
    await browser.close();
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      message: "Nenhum produto encontrado para a pesquisa.",
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }

  const showMoreButton = await page.$(".show-more button");
  if (showMoreButton) {
    await showMoreButton.click();
    console.log("Clicando no botão 'Mostrar mais'");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  await page.waitForSelector(".product-tile-pd", { timeout: 10000 });
  console.log("Produtos carregados. Extraindo informações...");

  await autoScroll(page);

  const products = await page.evaluate(() => {
    const items = document.querySelectorAll(".product-tile-pd");
    return Array.from(items).map((item) => {
      const name =
        item.querySelector(".product-name-link a")?.innerText.trim() || "ERROR";

      let price = "N/A";
      const priceBruto = item.querySelector(".value")?.getAttribute("content");

      if (priceBruto) {
        // Corrigido: replace de ponto por vírgula
        price = priceBruto.replace(/\./g, ",") + "€";
      }

      const image =
        item.querySelector(".product-tile-image-link img")?.src || "ERROR";

      const urldoproduto =
        item.querySelector(".product-name-link a")?.href || "ERROR";

      return { name, price, image, urldoproduto };
    });
  });

  console.log(`Produtos encontrados: ${products.length}`);

  await browser.close();

  const executionTime = Date.now() - startTime;
  if (products.length === 0) {
    console.log("Nenhum produto encontrado para a pesquisa.");
    return {
      success: false,
      message: "Nenhum produto encontrado para a pesquisa.",
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }
  return {
    success: true,
    timestamp: new Date().toISOString(),
    search: {
      term: pesquisa,
      url: pagina,
    },
    summary: {
      total_products: products.length,
      execution_time_ms: executionTime,
    },
    products: products,
  };
}

async function scraper_Continente(pagina, pesquisa) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const startTime = Date.now();

  await page.goto(pagina);

  const title = await page.title();
  console.log("Título da página:", title);

  const searchSelector = "input[name='q']";
  await page.waitForSelector(searchSelector);

  console.log("Campo de pesquisa encontrado. Realizando busca...");
  await page.type(searchSelector, pesquisa);
  console.log(`Texto digitado no campo de pesquisa: ${pesquisa}`);
  await page.keyboard.press("Enter");
  console.log(`Realizando pesquisa por: ${pesquisa}`);
  await page.waitForNavigation({ waitUntil: "networkidle0" });
  console.log("Pesquisa concluída. Página de resultados carregada.");

  if (await page.$(".search-noresults-wrapper")) {
    console.log("Nenhum produto encontrado para a pesquisa.");
    await browser.close();
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      message: "Nenhum produto encontrado para a pesquisa.",
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }

  await page.waitForSelector("div[class ='product']", { timeout: 10000 });
  console.log("Produtos carregados. Extraindo informações...");

  await autoScroll(page);

  const products = await page.evaluate(() => {
    const items = document.querySelectorAll("div[class ='product']");
    return Array.from(items).map((item) => {
      const name =
        item.querySelector(".pwc-tile--description")?.innerText.trim() ||
        "ERROR";
      const image = item.querySelector(".ct-tile-image")?.src || "ERROR";

      const priceSpan = item.querySelector(".pwc-tile--price-primary");
      let price = "N/A";

      if (priceSpan) {
        const integerPart = priceSpan.childNodes[0]?.textContent.trim();
        const decimalPart = priceSpan.querySelector(".decimalPrice")?.innerText;

        if (integerPart && decimalPart) {
          price = integerPart + decimalPart;
        }
      }

      const urldoproduto =
        item.querySelector(".ct-pdp-link a")?.href || "ERROR";

      return { name, price, image, urldoproduto };
    });
  });

  console.log(`Produtos encontrados: ${products.length}`);
  await browser.close();

  const executionTime = Date.now() - startTime;
  if (products.length === 0) {
    console.log("Nenhum produto encontrado para a pesquisa.");
    return {
      success: false,
      message: "Nenhum produto encontrado para a pesquisa.",
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }

  console.log("Produtos encontrados. Retornando resultados...");
  return {
    success: true,
    timestamp: new Date().toISOString(),
    search: {
      term: pesquisa,
      url: pagina,
    },
    summary: {
      total_products: products.length,
      execution_time_ms: executionTime,
    },
    products: products,
  };
}

async function scraper_Auchan(pagina, pesquisa) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const startTime = Date.now();

  await page.goto(pagina);

  const title = await page.title();
  console.log("Título da página:", title);

  const searchSelector = "input[name='q']";
  await page.waitForSelector(searchSelector);

  console.log("Campo de pesquisa encontrado. Realizando busca...");
  await page.type(searchSelector, pesquisa);
  console.log(`Texto digitado no campo de pesquisa: ${pesquisa}`);

  await page.keyboard.press("Enter");
  console.log(`Realizando pesquisa por: ${pesquisa}`);

  await page.waitForNavigation({ waitUntil: "networkidle0" });
  console.log("Pesquisa concluída. Página de resultados carregada.");

  if (await page.$(".auc-noresults__error--message")) {
    console.log("Nenhum produto encontrado para a pesquisa.");
    await browser.close();
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      message: "Nenhum produto encontrado para a pesquisa.",
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }

  await page.waitForSelector(".product-grid", { timeout: 1000 });
  console.log("Produtos carregados. Extraindo informações...");

  await autoScroll(page);

  const products = await page.evaluate(() => {
    const items = document.querySelectorAll(".product");

    return Array.from(items)
      .filter((item) => {
        const image = item.querySelector(".tile-image")?.src || "ERROR";
        return !image.includes("pesquisa?search-button=&q");
      })
      .map((item) => {
        const name = item.querySelector(".link")?.innerText.trim() || "ERROR";

        let price = "N/A";
        const priceBruto =
          item.querySelector(".sales span.value")?.getAttribute("content") ||
          "ERROR";

        if (priceBruto) {
          price = priceBruto.replace(/\./g, ",") + "€";
        }

        const image = item.querySelector(".tile-image")?.src || "ERROR";
        const urldoproduto = item.querySelector(".link")?.href || "ERROR";

        return { name, price, image, urldoproduto };
      });
  });
  console.log(`Produtos encontrados: ${products.length}`);
  await browser.close();

  const executionTime = Date.now() - startTime;
  if (products.length === 0) {
    console.log("Nenhum produto encontrado para a pesquisa.");
    return {
      success: false,
      message: "Nenhum produto encontrado para a pesquisa.",
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }

  console.log("Produtos encontrados. Retornando resultados...");
  return {
    success: true,
    timestamp: new Date().toISOString(),
    search: {
      term: pesquisa,
      url: pagina,
    },
    summary: {
      total_products: products.length,
      execution_time_ms: executionTime,
    },
    products: products,
  };
}

async function scraper_lidl(pagina, pesquisa) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const startTime = Date.now();

  await page.goto(pagina);
  const title = await page.title();
  console.log("Título da página:", title);
  const searchSelector = "input[name='q']";

  await page.waitForSelector(searchSelector);
  console.log("Campo de pesquisa encontrado. Realizando busca...");

  await page.type(searchSelector, pesquisa);
  console.log(`Texto digitado no campo de pesquisa: ${pesquisa}`);

  await page.keyboard.press("Enter");
  console.log(`Realizando pesquisa por: ${pesquisa}`);

  await page.waitForNavigation({ waitUntil: "networkidle0" });
  console.log("Pesquisa concluída. Página de resultados carregada.");

  if (await page.$(".s-products-not-found-message-wrapper")) {
    console.log("Nenhum produto encontrado para a pesquisa.");
    await browser.close();
    const executionTime = Date.now() - startTime;
    return {
      success: false,
      message: "Nenhum produto encontrado para a pesquisa.",
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }

  console.log("Produtos encontrados. Continuando com a extração...");

  await page.waitForSelector("#search-results", { timeout: 10000 });
  console.log("Produtos carregados. Extraindo informações...");

  await autoScroll(page);

  const products = await page.evaluate(() => {
    const items = document.querySelectorAll(".product-grid-box");
    return Array.from(items).map((item) => {
      const brand =
        item.querySelector(".product-grid-box__brand")?.innerText.trim() || "";
      const title =
        item.querySelector(".product-grid-box__title")?.innerText.trim() || "";
      const name = brand + (brand && title ? " " : "") + title || "ERROR";

      let price = "N/A";
      const priceBruto =
        item.querySelector(".ods-price__value")?.innerHTML.trim() || "ERROR";
      if (priceBruto) {
        price = priceBruto.replace(/\./g, ",") + "€";
      }
      const image =
        item.querySelector(".odsc-image-gallery__image")?.src || "ERROR";
      const urldoproduto =
        item.querySelector(".odsc-tile__link")?.href || "ERROR";
      return { name, price, image, urldoproduto };
    });
  });

  console.log(`Produtos encontrados: ${products.length}`);
  await browser.close();

  const executionTime = Date.now() - startTime;
  if (products.length === 0) {
    console.log("Nenhum produto encontrado para a pesquisa.");
    return {
      success: false,
      message: "Nenhum produto encontrado para a pesquisa.",
      timestamp: new Date().toISOString(),
      execution_time_ms: executionTime,
    };
  }

  console.log("Produtos encontrados. Retornando resultados...");
  return {
    success: true,
    timestamp: new Date().toISOString(),
    search: {
      term: pesquisa,
      url: pagina,
    },
    summary: {
      total_products: products.length,
      execution_time_ms: executionTime,
    },
    products: products,
  };
}

async function scraper_Intermarche(pagina, pesquisa) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const startTime = Date.now();

  await page.goto(pagina);
  const title = await page.title();
  console.log("Título da página:", title);

  const searchSelector = "input[id='header-search-text']";
  await page.waitForSelector(searchSelector);
  console.log("Campo de pesquisa encontrado. Realizando busca...");

  await page.type(searchSelector, pesquisa);
  console.log(`Texto digitado no campo de pesquisa: ${pesquisa}`);

  await page.keyboard.press("Enter");
  console.log(`Realizando pesquisa por: ${pesquisa}`);

  await page.waitForNavigation({ waitUntil: "networkidle0" });
  console.log("Pesquisa concluída. Página de resultados carregada.");

  await page.waitForSelector(".productList__grid__item", { timeout: 10000 });
  console.log("Produtos carregados. Extraindo informações...");

  const products = await page.evaluate(() => {
    const items = document.querySelectorAll(".productList__grid__item");
    return Array.from(items).map((item) => {
      const name =
        item.querySelector(".product__brand")?.innerText.trim() ||
        "ERROR" + item.querySelector(".product-name-link")?.innerText.trim() ||
        "ERROR";

      let price = "N/A";
      const priceBruto = item
        .querySelector(".productList__grid__item")
        ?.getAttribute("data-price");
      if (priceBruto) {
        price = priceBruto.replace(/\./g, ",") + "€";
      }
      const image =
        item.querySelector(".image product__image no-flag")?.src || "ERROR";
      return { name, price, image };
    });
  });

  console.log(`Produtos encontrados: ${products.length}`);

  await browser.close();

  const executionTime = Date.now() - startTime;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    search: {
      term: pesquisa,
      url: pagina,
    },
    summary: {
      total_products: products.length,
      execution_time_ms: executionTime,
    },
    products: products,
  };
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    const targetHeight = document.body.scrollHeight * 2; // Ajuste para scroll mais profundo
    const duration = 2000;
    const startTime = Date.now();
    const startPosition = window.scrollY;

    await new Promise((resolve) => {
      const scrollInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentPosition =
          startPosition + (targetHeight - startPosition) * progress;
        window.scrollTo(0, currentPosition);

        if (progress >= 1) {
          clearInterval(scrollInterval);
          resolve();
        }
      }, 16);
    });

    // Espera 2 segundos adicionais após o scroll completar
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });
}

module.exports = {
  scraper_PingoDoce,
  scraper_Continente,
  scraper_Auchan,
  scraper_lidl,
  scraper_Intermarche,
  testebrowserless,
};
