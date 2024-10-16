/**
 * The class for each record.
 */
class Record {

    /**
     * The record builder.
     * @param {string} caption - The caption of the record.
     * @param {number} amount - The amount of the item.
     * @param {Date} date - The date of purchasing the item.
     * @param {string} memo - Additional information.
     */
    constructor(caption, amount, date, memo) {
        
        /**
         * Removes the html characters from the string.
         * @param {string} text - The unsanitized text.
         * @returns {string} The sanitized, HTML safe text.
         */
        const sanitizeHTML = text => {
            
            /**
             * @type {object} The replace items.
             */
            const escapeMap = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '/': '&#x2F;',
                '`': '&#x60;',
                '=': '&#x3D;'
            };

            return text.replace(/[&<>"'`=\/]/ig, m => (escapeMap[m]));
        };

        this.caption = sanitizeHTML(caption);
        this.amount = amount;
        this.date = date;
        this.memo = sanitizeHTML(memo);
    }

    /**
     * Get the HTML code (as a table row) ready to be added to the existing table.
     * @returns {string} The literal representation that can be used in the table.
     */
    getLiteral() {
        return `
            <tr>
                <td>${this.caption}</td>
                <td>${formatNumber(this.amount)}</td>
                <td>${this.date.toLocaleString('en-US', {month: 'long'})} ${this.date.getDate()}, ${this.date.getFullYear()}</td>
                <td>${this.memo}</td>
                <td><button title="Delete record" class="delete">Delete</button></td>
            </tr>
        `;
    }
}

/**
 * @type {Array<Record>} The record array.
 */
let recordArray = [];

/**
 * Add new record to the array.
 */
const addNewRecord = () => {
    
    /**
     * @type {Record} The data of the new record.
     */
    const newRecord = new Record(
                                 $('#caption').val(),
                                 parseInt($('#amount').val()),
                                 new Date($('#date').val()),
                                 $('#memo').val()
                      );

    recordArray.push(newRecord);
    $('tbody').append(newRecord.getLiteral());

    // Clear original field values
    $('#caption').val('');
    $('#amount').val('');
    $('#date').val('2023-12-31');
    $('#memo').val('');

    calculateStatistics();
};

/**
 * Calculate the statistics in the 'Statistics' section.
 */
const calculateStatistics = () => {

    // Get all amount properties in recordArray.
    const amountArray = recordArray.map(v => isNaN(v.amount) ? -1 : v.amount).filter(v => v > 0);

    // Calculate descriptive statistics
    const statCount = recordArray.length;
    const statSum = amountArray.reduce((x, v) => x + v, 0);
    const statMean = Math.round(statSum / amountArray.length , 2);

    // Source: https://stackoverflow.com/a/53660837
    const median = (numbers)  => {
        const sorted = Array.from(numbers).sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
    
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
    
        return sorted[middle];
    }

    const statMedian = median(amountArray);

    $('#statCount').text(formatNumber(statCount));
    $('#statSum').text(formatNumber(statSum));
    $('#statMean').text(formatNumber(statMean));
    $('#statMedian').text(formatNumber(statMedian));
}

/**
 * Removes the record from the table.
 * @param {HTMLButtonElement} button - The clicked button
 */
const deleteRecord = (button) => {
    $(button).parent().parent().remove();
    recordArray.splice($(button).index(), 1);
    calculateStatistics();
}

/**
 * Format the numbers.
 * @param {number} num - The inputted number.
 * @returns {string} The formatted number with comma delimiters.
 */
const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

/**
 * Validate the user input to make sure the wrong input will not be sent back.
 * @param {jQuery.fn.init} textField - The input field element. 
 */
const validateNumber = (textField) => {
    
    textField.first().on('blur', () => {
    
        /**
         * @type {string} The validated and filtered input.
         */
        const validated = textField.val().replace(/[^\d]/g, '') // Removes any non-digits
        
        // Send the warning message
        if (textField.val() != validated) {
            console.warn(`Invalid input in #${textField.attr('id')}; user inputted '${textField.val()}', but the valid value is '${validated}'`);
            textField.val(validated);
        }

    });
}

// Shorhand function for $(document).ready();
$(() => {
    /**
     * @type {Array<Record>} Pre-defined records.
     */
    const predefined = [
        new Record('Sneakers', 2450, new Date('2024-07-16'), 'Nice price.'),
        new Record('Cup Noodles', 220, new Date('2024-08-20'), 'The worst thing I\'ve ever ordered.')
    ];

    // Add predefined data.
    for (const item of predefined) {
        $('tbody').append(item.getLiteral());
        recordArray.push(item);
    }

    // Add event listeners
    $('button[type=\"submit\"]').on('click', () => {
        addNewRecord();
    });
    $('#amount').on('click', () => {
        validateNumber($('#amount'));
    });
    $('.delete').on('click', function() {   // Note that arrow function can not be used with 'this' keyword
        deleteRecord($(this).get(0));
    });

    calculateStatistics();
});