// This assignment uses arrow functions, which are introduced in ES6 as syntactic sugar.

/**
 * A wrap-up class to perform external JSON requests.
 */
class JSONRequest {
    
    /**
     * A wrap-up class to perform external JSON requests.
     * @param {string} url - The URL of the JSON file.
     */
    constructor(url) {
        this._path = url;
    }

    /**
     * The JSON object of the targeted file. 
     * @returns {string|object} The JSON object or an empty string (if failed.)
     */
    async run() {

        // Handle exceptions
        try {

            // Fetch the file
            const bytes = await requireData(this._path);
            return JSON.parse(new TextDecoder().decode(bytes));

        } catch (error) {

            // Report error
            console.error(error);
            return '';
        }
    }
}

/**
 * Create dropdowns by substituting the elements with the class `currency-dropdown` inside of the scope.
 * @param {(Document|HTMLElement)} scope - The HTML document or element that represents the scope.
 */
const createDropdown = (scope) => {

    // Retrieve all elements inside of the scope.
    const dropdownCollection = scope.getElementsByClassName('currency-dropdown');

    // All supported currency types
    const currencyCollection = [
        '🇹🇼 TWD',
        '🇺🇸 USD',
        '🇪🇺 EUR',
        '🇬🇧 GBP',
        '🇯🇵 JPY',
        '🇨🇳 CNY',
        '🇦🇺 AUD',
        '🇰🇷 KRW',
        '🇸🇬 SGD',
        '🇭🇰 HKD'
    ];

    for (let i = 0; i < dropdownCollection.length; i++) {

        const node = dropdownCollection[i];
        
        // Remove all potential childs of the node.
        while (node.lastChild) {
            node.removeChild(node.lastChild);
        }

        const button = document.createElement('button');
        button.innerText = currencyCollection[i]
        node.appendChild(button);
        
        for (const currency of currencyCollection) {

            // Create options for each currency type
            const option = document.createElement('a');
            option.setAttribute('href', '#');
            option.innerText = currency;
            node.appendChild(option);
        }
    }
}

/**
 * Require data from the target source.
 * @param {string} url - The URL of the target file.
 * @returns {undefined|Promise<Uint8Array>} The data as `Uint8Array`.
 */
const requireData = async (url) => {

    // Wait for the browser to fetch data
    const response = await fetch(url);

    // Handle exceptions when fetching data
    if (!response.ok) {
        throw new Error(`Error on fetching data: ${response.status}`);
    }

    // Get file as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

/**
 * The JSON documenting currency exchange rates.
 * @type {Object}
 */
let exchangeRateJSON;

// Execute the functions after the page is loaded
window.onload = () => {

    // Request JSON
    new JSONRequest('..\\src\\exchange.json').run()
        .then((result) => {
            exchangeRateJSON = result;
            console.log(exchangeRateJSON);
        });

    createDropdown(document);
}