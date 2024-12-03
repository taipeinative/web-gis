/**
 * The class for managing ajax calls.
 */
class AJAX {
    /**
     * Downloads server records.
     */
    static downloadRecords() {
        $.ajax({
            url: './server.php?action=download',
            method: 'GET',
            success: function (data) {
                const tempAnchor = document.createElement('a');
                const blobURL = window.URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
                tempAnchor.classList.add('hidden');
                tempAnchor.href = blobURL;
                tempAnchor.target = '_self',
                tempAnchor.rel = 'noopener',
                tempAnchor.download = 'records.json';

                document.body.appendChild(tempAnchor);
                tempAnchor.click();
                document.body.removeChild(tempAnchor);
                window.URL.revokeObjectURL(blobURL);
            },
            error: function (xhr, status, err) {
                console.log('Error:', status, err);
            }
        });
    }

    /**
     * Sync local records with server records.
     */
    static pullRecords() {
        $.ajax({
            url: './server.php?action=pull',
            method: 'GET',
            success: function (data) {
                syncRecords(data);
                console.log('Pull successfully.');
            },
            error: function (xhr, status, err) {
                console.log('Error:', status, err);
            }
        });
    }

    /**
     * Sync server records with local records. Also used in the upload action.
     */
    static pushRecords() {
        const localRecords = JSON.stringify(recordArray.map(v => v.getJSON()));
        $.ajax({
            url: './server.php?action=push',
            method: 'POST',
            data: localRecords,
            contentType: 'application/json',
            success: function (res) {
                console.log('Push successfully.');
            },
            error: function (xhr, status, err) {
                console.log('Error:', status, err);
            }
        });
    }
}

/**
 * The class for handling encoding problems.
 */
class Encoding {
    /**
     * @type {Object<string, string>} The object for escaping the HTML encoding.
     */
    static escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };

    /**
     * @type {Object<string, string>} The object for unescaping the HTML encoding.
     */
    static unescapeMap = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x2F;': '/',
        '&#x60;': '`',
        '&#x3D;': '='
    };

    /**
     * Replaces the special characters with HTML-escaped characters.
     * @param {string} text - The unsanitized text.
     * @returns {string} The sanitized, HTML safe text.
     */
    static sanitizeHTML(text) {
        return text.replace(/[&<>"'`=\/]/ig, m => (Encoding.escapeMap[m]));
    }

    /**
     * Replaces the HTML-escaped characters with its original characters.
     * @param {string} text - The sanitized text.
     * @returns {string} Original text.
     */
    static desanitizeHTML(text) {
        return text.replace(/&(amp|lt|gt|quot|#39|#x2F|#x60|#x3D);/g, m => this.unescapeMap[m] || m);
    }
}

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
        this.caption = caption;
        this.amount = amount;
        this.date = date;
        this.memo = memo;
    }

    /**
     * Get the JSON representation of the object.
     * @returns {object} The record object.
     */
    getJSON() {
        return {
                "caption": this.caption,
                "amount": this.amount,
                "date": this.date.toISOString().split('T')[0],
                "memo": this.memo
               };
    }

    /**
     * Get the HTML code (as a table row) ready to be added to the existing table.
     * @returns {string} The literal representation that can be used in the table.
     */
    getLiteral() {
        return `
            <tr>
                <td>${Encoding.sanitizeHTML(this.caption)}</td>
                <td>${formatNumber(this.amount)}</td>
                <td>${this.date.toLocaleString('en-US', {month: 'long'})} ${this.date.getDate()}, ${this.date.getFullYear()}</td>
                <td>${Encoding.sanitizeHTML(this.memo)}</td>
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
    
    let sanitizedInt = parseInt($('#amount').val());
    if (isNaN(sanitizedInt)) {
        sanitizedInt = 0;
    }
    
    /**
     * @type {Record} The data of the new record.
     */
    const newRecord = new Record(
                                 $('#caption').val(),
                                 sanitizedInt,
                                 new Date($('#date').val()),
                                 $('#memo').val()
                      );

    recordArray.push(newRecord);
    $('tbody').append(newRecord.getLiteral());
    $('.delete').last().on('click', function() {
        deleteRecord($(this).get(0));
    });

    // Clear original field values
    $('#caption').val('');
    $('#amount').val('');
    $('#date').val('2023-12-31');
    $('#memo').val('');

    AJAX.pushRecords();
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
    recordArray.splice($(button).parent().parent().index(), 1);
    $(button).parent().parent().remove(); 
    AJAX.pushRecords();
    calculateStatistics();
}

/**
 * Format the numbers.
 * @param {number} num - The inputted number.
 * @returns {string} The formatted number with comma delimiters.
 */
const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

/**
 * Refresh the UI and sync the given data.
 * @param {Array} data - The given data
 */
const syncRecords = (data) => {
    if (data instanceof Array) {

        let sanitizedData = [];

        for (const entry of data) {
            let caption = '';
            let amount = 0;
            let date = new Date('1970-01-01');
            let memo = '';

            if (entry.hasOwnProperty('caption')) {
                if (typeof(entry['caption']) == 'string') {
                    caption = entry['caption'];
                }
            }
            if (entry.hasOwnProperty('amount')) {
                if (typeof(entry['amount']) == 'number') {
                    amount = entry['amount'];
                }
            }
            if (entry.hasOwnProperty('date')) {
                date = new Date(entry['date']);
            }
            if (entry.hasOwnProperty('memo')) {
                if (typeof(entry['memo']) == 'string') {
                    memo = entry['memo'];
                }
            }

            sanitizedData.push(new Record(caption, amount, date, memo));
        }

        document.getElementsByTagName('tbody')[0].innerText = '';
        recordArray = sanitizedData;
        sanitizedData.forEach(v => $('tbody').append(v.getLiteral()));
        $('.delete').on('click', function() {   // Note that arrow function can not be used with 'this' keyword
            deleteRecord($(this).get(0));
        });
        calculateStatistics();
    }
}

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

    // Pull server data
    AJAX.pullRecords();

    // Add event listeners
    $('button[type=\"submit\"]').on('click', () => {
        addNewRecord();
    });
    $('#amount').on('click', () => {
        validateNumber($('#amount'));
    });
    $('#download').on('click', () => {
        AJAX.downloadRecords();
    });
    $('#upload').on('change', function() {
        const files = this.files;

        if (files.length == 0) {
            console.log('No file selected.');
        }

        if (files[0].type != 'application/json') {
            console.log('Invalid file input.');
        }

        const fReader = new FileReader();

        fReader.onload = function(e) {
            try {
                syncRecords(JSON.parse(e.target.result));
                AJAX.pushRecords();
                console.log('Upload successfully.');
            } catch (err) {
                console.log('Error', err);
            }
        }

        fReader.onerror = () => {
            console.error('Error occured when reading the file.');
        };

        fReader.readAsText(files[0]);
    });
    $('#uploadBtn').on('click', () => {
        $('#upload').click();
    });

    calculateStatistics();
});