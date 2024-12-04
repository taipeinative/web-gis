/**
 * The helper function for initialization.
 */
const initialize = () => {
    $.ajax({
        url: './server.php?action=init',
        method: 'GET',
        success: function (initData) {
            const { oldestMonth, latestMonth} = initData;
            $('#dateAfter').val(oldestMonth);
            $('#dateBefore').val(latestMonth);
            $('#dateAfter, #dateBefore').attr('min', oldestMonth);
            $('#dateAfter, #dateBefore').attr('max', latestMonth);
            queryData();
        },
        error: function (xhr, status, err) {
            console.log('Error:', status, err);
        }
    });
}

/**
 * Send the query strings and expect the result from the server. 
 */
const queryData = () => {
    const after = $('#dateAfter').val();
    const before = $('#dateBefore').val();
    const stock = stockMap[$('#stock').val()];

    $.ajax({
        url: './server.php?action=query',
        method: 'GET',
        data: { after, before, stock },
        success: function (data) {
            renderData(data);
        },
        error: function (xhr, status, err) {
            console.log('Error querying data:', status, err);
        }
    });
}

/**
 * Render the retrieved data.
 * @param {object} data - The json object.
 */
const renderData = (data) => {
    // Clear exisiting graph
    d3.select('.graphContainer').selectAll('svg').remove();

    // Dimensions
    const margin = { top: 50, right: 30, bottom: 50, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3.select('.graphContainer')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse the data
    const parsedData = data.map(d => ({
        date: d3.timeParse('%Y-%m')(d['月別']),
        value: +d.value
    }));

    // Set scales
    const x = d3.scaleTime()
        .domain(d3.extent(parsedData, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(parsedData, d => d.value)]).nice()
        .range([height, 0]);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6));

    svg.append('g')
        .call(d3.axisLeft(y));

    // Add line
    svg.append('path')
        .datum(parsedData)
        .attr('fill', 'none')
        .attr('stroke', '#0d6efd')
        .attr('stroke-width', 2)
        .attr('d', d3.line()
            .x(d => x(d.date))
            .y(d => y(d.value))
        );

    // Add points
    svg.selectAll('.dot')
        .data(parsedData)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(d.value))
        .attr('r', 4)
        .attr('fill', '#0d6efd');
}

/**
 * The conversion map between field names and option names.
 */
const stockMap = {
    '🇺🇸 Nasdaq': '美國-那斯達克指數',
    '🇺🇸 Dow': '美國-道瓊工業指數',
    '🇬🇧 FTSE 100': '倫敦-金融時報指數',
    '🇯🇵 NI225': '日本-日經225指數',
    '🇰🇷 KOSPI': '南韓-綜合指數',
    '🇹🇼 TAIEX': '台灣-加權指數',
    '🇹🇼 TPEX': '台灣-上櫃指數',
    '🇨🇳 SSE': '中國-上海綜合指數',
    '🇭🇰 HSI': '中國-香港恆生指數',
    '🇸🇬 STI': '新加坡-海峽時報指數'
};

// Shorhand function for $(document).ready();
$(() => {
    // Initialization
    initialize();

    // Event listeners
    $('#detailBanner').on('click', () => {
        $('.propertyContainer').first().toggleClass('hidden');
        if ($('#detailBanner box-icon').attr('name') == 'caret-down-circle') {
            $('#detailBanner box-icon').attr('name', 'caret-up-circle');
            $('#detailBanner box-icon').attr('title', 'Collapse detail');
            $('#detailBanner h4').text('Collapse');
        } else {
            $('#detailBanner box-icon').attr('name', 'caret-down-circle');
            $('#detailBanner box-icon').attr('title', 'Expand detail');
            $('#detailBanner h4').text('Expand');
        }
    });
    $('#dateAfter, #dateBefore, #stock').on('change', queryData);
});