// Mock rates as fallback
const MOCK_RATES = new Map([
  ['USD_EUR', 0.85],
  ['USD_GBP', 0.73],
  ['USD_JPY', 110.0],
  ['EUR_USD', 1.18],
  ['EUR_GBP', 0.86],
  ['EUR_JPY', 129.53],
  ['GBP_USD', 1.37],
  ['GBP_EUR', 1.16],
  ['GBP_JPY', 150.75],
  ['JPY_USD', 0.0091],
  ['JPY_EUR', 0.0077],
  ['JPY_GBP', 0.0066]
]);

// Token icons from Switcheo repo
const TOKEN_ICONS = {
  USD: 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/USD.svg',
  EUR: 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/EEUR.svg',
  GBP: 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/GBP.svg',
  JPY: 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/JPY.svg',
  BTC: 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/BTC.svg',
  ETH: 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/ETH.svg',
  USDT: 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/USDT.svg',
  USDC: 'https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/USDC.svg'
};

// Cached exchange rates
let exchangeRates = new Map(MOCK_RATES);
let pricesCache = null;

// Formatter cache
const formatters = new Map();

function getCurrencyFormatter(currencyCode) {
  if (!formatters.has(currencyCode)) {
    formatters.set(
      currencyCode,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
      })
    );
  }
  return formatters.get(currencyCode);
}

// Fetch prices from API
async function fetchPrices() {
  if (pricesCache) {
    return pricesCache;
  }

  try {
    const response = await fetch('https://interview.switcheo.com/prices.json');
    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }
    const data = await response.json();
    pricesCache = data;
    return data;
  } catch (error) {
    console.error('Error fetching prices:', error.message);
    return null;
  }
}

// Build exchange rates from API prices
function buildExchangeRates(prices) {
  if (!prices || Object.keys(prices).length === 0) {
    return MOCK_RATES;
  }

  const rates = new Map();
  const tokens = Object.keys(prices).filter(t => prices[t] !== null);

  // Build rates based on USD base
  tokens.forEach(token => {
    const price = prices[token];
    if (price && price !== 0) {
      // Store USD-based rates
      rates.set(`USD_${token}`, 1 / price);
      rates.set(`${token}_USD`, price);
    }
  });

  // Build cross-rates
  tokens.forEach(fromToken => {
    tokens.forEach(toToken => {
      if (fromToken !== toToken) {
        const fromRate = prices[fromToken];
        const toRate = prices[toToken];
        if (fromRate && toRate && fromRate !== 0) {
          rates.set(`${fromToken}_${toToken}`, fromRate / toRate);
        }
      }
    });
  });

  // Add mock rates for traditional currencies
  MOCK_RATES.forEach((value, key) => {
    rates.set(key, value);
  });

  return rates.size > 0 ? rates : MOCK_RATES;
}

// Initialize prices and rates
async function initializeRates() {
  const prices = await fetchPrices();
  if (prices) {
    exchangeRates = buildExchangeRates(prices);
    updateAvailableCurrencies(prices);
  }
}

// Update available currencies in dropdowns
function updateAvailableCurrencies(prices) {
  const fromSelect = document.getElementById('from-currency');
  const toSelect = document.getElementById('to-currency');

  if (!prices) return;

  const tokens = Object.keys(prices).filter(t => prices[t] !== null);
  
  // Keep track of current selections
  const fromValue = fromSelect.value;
  const toValue = toSelect.value;

  // Clear existing options
  fromSelect.innerHTML = '';
  toSelect.innerHTML = '';

  // Add traditional currencies first
  ['USD', 'EUR', 'GBP', 'JPY'].forEach(currency => {
    addCurrencyOption(fromSelect, currency, false);
    addCurrencyOption(toSelect, currency, false);
  });

  // Add crypto tokens
  tokens.forEach(token => {
    if (!['USD', 'EUR', 'GBP', 'JPY'].includes(token)) {
      addCurrencyOption(fromSelect, token, true);
      addCurrencyOption(toSelect, token, true);
    }
  });

  // Restore selections if they still exist
  if (fromSelect.querySelector(`option[value="${fromValue}"]`)) {
    fromSelect.value = fromValue;
  }
  if (toSelect.querySelector(`option[value="${toValue}"]`)) {
    toSelect.value = toValue;
  }

  updateCurrencyIcons();
}

function addCurrencyOption(select, currency, isCrypto) {
  const option = document.createElement('option');
  option.value = currency;
  option.textContent = `${currency}${isCrypto ? ' (Crypto)' : ''}`;
  option.dataset.crypto = isCrypto;
  select.appendChild(option);
}

function validateInput(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Input must be a valid number');
  }
  if (value < 0) {
    throw new Error('Input must be non-negative');
  }
  if (value > 1000000) {
    throw new Error('Amount too large');
  }
  return value;
}

function convertToCents(amount) {
  return Math.round(amount * 100);
}

function convertFromCents(cents) {
  return cents / 100;
}

function getConversionRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return 1;
  }
  const rateKey = `${fromCurrency}_${toCurrency}`;
  if (!exchangeRates.has(rateKey)) {
    throw new Error(`Exchange rate not available for ${rateKey}`);
  }
  return exchangeRates.get(rateKey);
}

function performConversion(amountInCents, fromCurrency, toCurrency) {
  const rate = getConversionRate(fromCurrency, toCurrency);
  const convertedCents = Math.round(amountInCents * rate);
  return convertedCents;
}

function updateOutputAmount() {
  const inputAmountInput = document.getElementById('input-amount');
  const outputAmountInput = document.getElementById('output-amount');
  const fromCurrencySelect = document.getElementById('from-currency');
  const toCurrencySelect = document.getElementById('to-currency');
  const errorMessage = document.getElementById('error-message');

  const inputAmount = parseFloat(inputAmountInput.value);
  
  if (isNaN(inputAmount) || inputAmount === 0) {
    outputAmountInput.value = '';
    hideError();
    return;
  }

  const fromCurrency = fromCurrencySelect.value;
  const toCurrency = toCurrencySelect.value;

  try {
    validateInput(inputAmount);
    hideError();
    
    const inputCents = convertToCents(inputAmount);
    const outputCents = performConversion(inputCents, fromCurrency, toCurrency);
    const outputAmount = convertFromCents(outputCents);
    outputAmountInput.value = outputAmount.toFixed(2);
  } catch (error) {
    console.error('Conversion error:', error.message);
    outputAmountInput.value = '';
    showError(error.message);
  }
}

// Dynamic token icon generation from Switcheo repo
function getTokenIconUrl(currency) {
  return `https://raw.githubusercontent.com/Switcheo/token-icons/main/tokens/${currency}.svg`;
}

function updateCurrencyIcons() {
  const fromSelect = document.getElementById('from-currency');
  const toSelect = document.getElementById('to-currency');
  const fromIcon = document.getElementById('from-icon');
  const toIcon = document.getElementById('to-icon');

  const fromCurrency = fromSelect.value;
  const toCurrency = toSelect.value;

  // Use dynamic icon URLs for all tokens
  fromIcon.src = getTokenIconUrl(fromCurrency);
  toIcon.src = getTokenIconUrl(toCurrency);

  fromIcon.alt = fromCurrency;
  toIcon.alt = toCurrency;
}

function swapCurrencies() {
  const fromCurrencySelect = document.getElementById('from-currency');
  const toCurrencySelect = document.getElementById('to-currency');
  const inputAmountInput = document.getElementById('input-amount');
  const outputAmountInput = document.getElementById('output-amount');

  const tempCurrency = fromCurrencySelect.value;
  fromCurrencySelect.value = toCurrencySelect.value;
  toCurrencySelect.value = tempCurrency;

  const tempAmount = inputAmountInput.value;
  inputAmountInput.value = outputAmountInput.value;
  outputAmountInput.value = tempAmount;

  updateCurrencyIcons();
  updateOutputAmount();
}

function showError(message) {
  const errorElement = document.getElementById('error-message');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  errorElement.style.animation = 'none';
  errorElement.offsetHeight; // Trigger reflow
  errorElement.style.animation = 'shake 0.5s ease-in-out';
}

function hideError() {
  const errorElement = document.getElementById('error-message');
  errorElement.style.display = 'none';
}

function showLoading() {
  const submitButton = document.getElementById('confirm-swap');
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner"></span> Processing...';
  submitButton.classList.add('loading');
}

function hideLoading() {
  const submitButton = document.getElementById('confirm-swap');
  submitButton.disabled = false;
  submitButton.innerHTML = 'CONFIRM SWAP';
  submitButton.classList.remove('loading');
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

async function handleSwapSubmit(event) {
  event.preventDefault();
  const inputAmountInput = document.getElementById('input-amount');
  const fromCurrencySelect = document.getElementById('from-currency');
  const toCurrencySelect = document.getElementById('to-currency');

  try {
    const amount = parseFloat(inputAmountInput.value);
    validateInput(amount);
    
    showLoading();

    // Simulate backend delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const formatter = getCurrencyFormatter(fromCurrencySelect.value);
    const formattedAmount = formatter.format(amount);
    
    const fromCurrency = fromCurrencySelect.value;
    const toCurrency = toCurrencySelect.value;
    
    showToast(`Swap confirmed: ${formattedAmount} ${fromCurrency} to ${toCurrency}`, 'success');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    hideLoading();
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  const inputAmountInput = document.getElementById('input-amount');
  const outputAmountInput = document.getElementById('output-amount');
  const fromCurrencySelect = document.getElementById('from-currency');
  const toCurrencySelect = document.getElementById('to-currency');
  const swapDirectionButton = document.getElementById('swap-direction');
  const confirmSwapButton = document.getElementById('confirm-swap');

  // Initialize rates and currencies
  initializeRates();
  updateCurrencyIcons();

  // Event listeners
  inputAmountInput.addEventListener('input', updateOutputAmount);
  fromCurrencySelect.addEventListener('change', () => {
    updateCurrencyIcons();
    updateOutputAmount();
  });
  toCurrencySelect.addEventListener('change', () => {
    updateCurrencyIcons();
    updateOutputAmount();
  });
  swapDirectionButton.addEventListener('click', swapCurrencies);
  confirmSwapButton.addEventListener('click', handleSwapSubmit);
});
