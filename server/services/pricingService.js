const db = require('../config/database');

/**
 * Computes exact price breakdown in INR (₹)
 */
function calculateOrderPrice({ storeId, pages, colorMode, gsmTierId, copies = 1, isDuplex = false }) {
  const pricing = db.getStorePricing(storeId);
  const gsmTiers = db.getStoreGsmTiers(storeId);

  const numPages = Math.max(1, parseInt(pages, 10) || 1);
  const numCopies = Math.max(1, parseInt(copies, 10) || 1);
  const isColor = colorMode === 'color';

  const baseRatePerPage = isColor ? pricing.color_rate : pricing.bw_rate;

  // Selected GSM tier surcharge
  const selectedTier = gsmTiers.find((t) => t.id === gsmTierId) || gsmTiers[0] || {
    name: 'Standard Paper',
    weight_gsm: 70,
    extra_cost: 0
  };
  const gsmSurcharge = selectedTier.extra_cost || 0;

  // Physical sheets count
  const sheetCount = isDuplex ? Math.ceil(numPages / 2) : numPages;

  // Printing cost per page + paper cost per sheet
  let printCost = numPages * baseRatePerPage;
  let paperCost = sheetCount * gsmSurcharge;

  // Duplex discount if applicable
  if (isDuplex && pricing.duplex_discount && numPages > 1) {
    // Discount applied on back pages
    const backPages = numPages - sheetCount;
    printCost -= backPages * pricing.duplex_discount;
  }

  const singleCopyTotal = Math.max(0, printCost + paperCost);
  const grandTotalINR = Math.round((singleCopyTotal * numCopies) * 100) / 100;

  return {
    pages: numPages,
    sheets: sheetCount,
    copies: numCopies,
    colorMode: isColor ? 'Color' : 'Black & White',
    baseRatePerPage,
    gsmTier: selectedTier.name,
    gsmSurcharge,
    isDuplex,
    singleCopyTotal: Math.round(singleCopyTotal * 100) / 100,
    grandTotalINR
  };
}

module.exports = {
  calculateOrderPrice
};
