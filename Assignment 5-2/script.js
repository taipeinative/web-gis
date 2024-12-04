// Shorhand function for $(document).ready();
$(() => {
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
});