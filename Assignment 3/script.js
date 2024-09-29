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
 * Array of all available currency types.
 * @type {Array<string>}
 */
const currencyCollection = [
    'TWD',
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'CNY',
    'AUD',
    'KRW',
    'SGD',
    'HKD'
];

/**
 * Object of all currency code pairs.
 * @type {object}
 */
const currencyCodeCollection = {
    '新台幣': 'TWD',
    '美元'  : 'USD',
    '歐元'  : 'EUR',
    '英鎊'  : 'GBP',
    '日圓'  : 'JPY',
    '人民幣': 'CNY',
    '澳幣'  : 'AUD',
    '韓元'  : 'KRW',
    '新加坡元': 'SGD',
    '港元'  : 'HKD'
};

/**
 * Object of all currency code pairs.
 * @type {object}
 */
const currencyUICollection = {
    'TWD': ['🇹🇼', 'New Taiwan Dollar'],
    'USD': ['🇺🇸', 'United States Dollar'],
    'EUR': ['🇪🇺', 'Euro'],
    'GBP': ['🇬🇧', 'Pound Sterling'],
    'JPY': ['🇯🇵', 'Japanese Yen'],
    'CNY': ['🇨🇳', 'Renminbi'],
    'AUD': ['🇦🇺', 'Australia Dollar'],
    'KRW': ['🇰🇷', 'South Korean Won'],
    'SGD': ['🇸🇬', 'Singapore Dollar'],
    'HKD': ['🇭🇰', 'Hong Kong Dollar']
};

/**
 * The index of the latest record of `exchangeRate`.
 * @type {number}
 */
let latestRecordIndex;

/**
 * The sheet documenting currency exchange rates.
 * @type {Array<object>}
 */
let exchangeRate = [];

/**
 * The JSON documenting currency exchange rates.
 * @type {Array<object>}
 */
let exchangeRateJSON;

/**
 * Create dropdowns by substituting the elements with the class `currency-dropdown` inside of the scope.
 * @param {(Document|HTMLElement)} scope - The HTML document or element that represents the scope.
 */
const createDropdown = (scope) => {

    // Retrieve all elements inside of the scope.
    const dropdownCollection = scope.getElementsByClassName('currency-dropdown');

    for (let i = 0; i < dropdownCollection.length; i++) {

        const node = dropdownCollection[i];
        
        // Remove all potential childs of the node.
        while (node.lastChild) {
            node.removeChild(node.lastChild);
        }

        const arrow = document.createElement('span');
        const contentText = document.createElement('span');
        const button = document.createElement('button');
        const gridBox = document.createElement('div');
        let optionArray = [];
        const wrapper = document.createElement('div');
        arrow.textContent = '˅';
        button.setAttribute('title', currencyUICollection[currencyCollection[i]][1]);
        button.setAttribute('translate', 'no');
        contentText.textContent = `${currencyUICollection[currencyCollection[i]][0]} ${currencyCollection[i]}`;
        button.appendChild(contentText);
        button.appendChild(arrow);
        
        for (const currency of currencyCollection) {

            // Create options for each currency type
            const option = document.createElement('a');
            option.setAttribute('href', '#');
            option.setAttribute('title', currencyUICollection[currency][1]);
            option.setAttribute('translate', 'no');
            option.textContent = `${currencyUICollection[currency][0]} ${currency}`;
            optionArray.push(option);
            wrapper.appendChild(option);
        }

        gridBox.appendChild(button);
        gridBox.appendChild(wrapper);
        node.appendChild(gridBox);

        for (const item of optionArray) {
            dropdownOptionHandler(item);
        }

        dropdownButtonHandler(button);
    }
}

/**
 * Delay the focusout event to squeeze in the click event on the options (or clicking elsewhere).
 * @param {HTMLElement} item - The button in the dropdown menu.
 */
const dropdownButtonHandler = (item) => {
    
    item.addEventListener('focusin', (e) => {

        item.classList.add('visible');
        e.preventDefault();
    });
    
    item.addEventListener('focusout', (e) => {
        
        setTimeout(() => {
            item.classList.remove('visible');
        }, 100);
        e.preventDefault();
    });
}

/**
 * Update the dropdown value when the user changed the option.
 * @param {HTMLElement} item - The option in the dropdown menu.
 */
const dropdownOptionHandler = (item) => {

    // The <div> element that contains the dropdown button and its options.
    const dropdownContainer = item.parentNode.parentNode;

    if (dropdownContainer.getElementsByTagName('button').length > 0) {
        
        item.addEventListener('click', (e) => {
        
            // The dropdown value (text) container.
            const dropdownValueContainer = item.parentElement.parentElement.querySelector('span:first-child');
            dropdownValueContainer.textContent = item.textContent;
            dropdownValueContainer.setAttribute('title', currencyUICollection[item.textContent.split(' ')[1]][1]);
            updateValue();
            e.preventDefault();
        });

    }
}

/**
 * Make sure that the input value is numeric only.
 * @param {HTMLInputElement} item - The input element.
 */
const inputValueHandler = (item) => {
    item.addEventListener('input', () => {
        
        // Validate the input string is a numeric value.
        const textInput = item.value.replace(/[^0-9.]/g, '').split('.', 2).join('.');

        if (textInput != item.value) {
            console.trace(`Invalid input: \"${item.value}\", corrected as \"${textInput}\"`);
        }
        
        item.value = textInput;
        updateValue();
    });
}

/**
 * Reformat retrieved JSON data.
 */
const reformatData = () => {

    exchangeRateJSON.forEach((item, i) => {

        const date = {};
        for (const property of Object.getOwnPropertyNames(item)) {

            if (property == '月別') {

                date['time'] = new Date(item[property]);
                if (latestRecordIndex === undefined) {
                    latestRecordIndex = 0;
                } else {

                    if (exchangeRate[latestRecordIndex]['time'] < date['time']) {
                        latestRecordIndex = i;
                    }
                }

            } else {
                date[currencyCodeCollection[property.match(/.+(?=（)/)[0]]] = parseFloat(item[property]);
            }
        }

        date['USD'] = 1;
        date['HKD'] = 7.8;  // HKD implements a linked exchange rate with USD.
        exchangeRate.push(date);
    });

    const updateTime = exchangeRate[latestRecordIndex]['time'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('time').textContent = `${months[updateTime.getMonth()]} ${updateTime.getFullYear()}`;
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
 * Swap the currency types.
 */
const swapCurrency = () => {

    // Swap currency types
    let currencyType1 = document.querySelector('#currency1 span').textContent.split(' ')[1];
    let currencyType2 = document.querySelector('#currency2 span').textContent.split(' ')[1];
    let currencyTypeT = currencyType1;
    currencyType1 = currencyType2;
    currencyType2 = currencyTypeT;

    // Change actual text contents
    document.querySelector('#currency1 span').textContent = `${currencyUICollection[currencyType1][0]} ${currencyType1}`;
    document.querySelector('#currency2 span').textContent = `${currencyUICollection[currencyType2][0]} ${currencyType2}`;
    updateValue();
}

/**
 * Handle the click events on tool buttons.
 */
const toolHandler = () => {
    
    // Copy Result button
    document.getElementById('copy').addEventListener('click', () => {
        navigator.clipboard.writeText(document.querySelector('.converter p').textContent);
        document.getElementById('copy').textContent = 'Copied !';
        setTimeout(() => {
            document.getElementById('copy').textContent = 'Copy Result';
        }, 1500);
    });
    
    document.querySelector('.converter p').addEventListener('click', () => {
        
        // Select the value
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(document.querySelector('.converter p'));
        selection.removeAllRanges();
        selection.addRange(range);

        // Force to click the copy button
        document.getElementById('copy').click();
    });

    // Swap Currency button
    document.getElementById('swap').addEventListener('click', () => {
        swapCurrency();
    });
}

/**
 * Update the converted number of the right-hand side currency.
 */
const updateValue = () => {
    const currencyType1 = document.querySelector('#currency1 span').textContent.split(' ')[1];
    const currencyType2 = document.querySelector('#currency2 span').textContent.split(' ')[1];
    const exchangeRate1 = exchangeRate[latestRecordIndex][currencyType1];
    const exchangeRate2 = exchangeRate[latestRecordIndex][currencyType2];
    let   inputValue    = document.querySelector('input[type="text"]').value;

    // Handle the shorthanded conditions.
    if (inputValue == '') {
        inputValue = '0';
    }

    if (inputValue[0] == '.') {
        inputValue = '0' + inputValue;
    }

    if (inputValue.slice(-1) == '.') {
        inputValue = inputValue + '0';
    }

    // Calculate the value in currency2 and override the old value.
    const outputValue = Math.round(parseFloat(inputValue) * (exchangeRate2 / exchangeRate1) * 10000) / 10000;
    document.querySelector('.converter p').textContent = outputValue;
}

// Execute the functions after the page is loaded.
window.onload = () => {

    // Request JSON
    new JSONRequest('..\\src\\exchange.json').run()
        .then((result) => {

            exchangeRateJSON = result;
            console.log('Successfully fetch JSON file');
            
            createDropdown(document);
            inputValueHandler(document.querySelector('input[type="text"]'));
            reformatData();
            toolHandler();
            updateValue();
        });
}