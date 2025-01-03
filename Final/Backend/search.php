<?php
// 可替換的關鍵字
$keyword_map = [
    ['台', '臺'],
    ['高速公路', '高速', '國道', '國'],
    ['號', '線'],
    ['北上', '北向'],
    ['南下', '南向'],
    ['k', 'K', '公里'],
    ['0', '０', '〇', '零'],
    ['1', '１', '一', '壹'],
    ['2', '２', '二', '貳'],
    ['3', '３', '三', '參', '叁'],
    ['4', '４', '四', '肆'],
    ['5', '５', '五', '伍'],
    ['6', '６', '六', '陸'],
    ['7', '７', '七', '柒'],
    ['8', '８', '八', '捌'],
    ['9', '９', '九', '玖']
];

// 負責管理搜尋的伺服器程式
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['q']) || empty($input['q'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing or empty keyword']);
        exit;
    }
    header('Content-Type: application/json; charset=utf-8');

    // 替換關鍵字，以便取得更佳結果
    $keyword = strtolower($input['q']);
    $keywords = [$keyword];
    foreach ($keyword_map as $keyword_set) {
        foreach ($keyword_set as $pattern) {
            $new_keywords = [];
            foreach ($keyword_set as $replacer) {
                foreach ($keywords as $key) {
                    if (strpos($keyword, $pattern) !== false) {
                        $new_keywords[] = preg_replace("/$pattern/u", $replacer, $key);
                    }
                }
            }
            $keywords = array_unique(array_merge($keywords, $new_keywords));
        }
    }

    /**
     * 選擇性的替換字串。（由於在較長字串中搜尋速度極為緩慢，雖保留但不使用）
     * @param array<string> $input_string_array 輸入字串陣列。
     * @return array<string> 包含原始字串在內，所有可能的替換字串。
     */
    function getPossibleReplacements($input_string_array) {
        $pattern = '/(?<=\d|０|〇|零|１|一|壹|２|二|貳|３|三|參|叁|４|四|肆|５|五|伍|６|六|陸|７|七|柒|８|八|捌|９|九|玖)(?!\d|k|K|公里|號|線|路|街|道|段|巷|弄|樓)/m';
        $replacement = '號';
        $result_array = [];

        foreach ($input_string_array as $input_string) {
            preg_match_all($pattern, $input_string, $matches, PREG_OFFSET_CAPTURE | PREG_SET_ORDER);
            $positions = array_map(fn($match) => $match[0][1], $matches);

            $results = [$input_string];
            $totalCombinations = 1 << count($positions);
            for ($i = 1; $i < $totalCombinations; $i++) {
                $modified = $input_string;
                $offset = 0;

                foreach ($positions as $bit => $pos) {
                    if ($i & (1 << $bit)) {
                        $modified = substr_replace($modified, $replacement, $pos + $offset, 0);
                        $offset += strlen($replacement);
                    }
                }

                $results[] = $modified;
            }

            $result_array = array_merge($result_array, $results);
        }

        return array_unique($result_array);
    }

    // $keywords = getPossibleReplacements($keywords);

    // 搜尋 GeoJSON 的特定欄位
    $geojson = json_decode(file_get_contents(dirname(__FILE__) . '\\source\\camera.geojson'), true);
    $filtered = array_filter($geojson['features'], function($feature) use ($keywords) {
        $properties = $feature['properties'] ?? [];
        foreach (['Address', 'CityName', 'RegionName'] as $column) {
            if (isset($properties[$column])) {
                foreach ($keywords as $key) {
                    if (strpos($properties[$column], $key) !== false) {
                        return true;
                    }
                }
            }
        }
        return false;
    });

    // 重新整理結果。
    $organized = array_map(function ($feature) {
        return [
            'Address' => $feature['properties']['Address'],
            'CityName' => $feature['properties']['CityName'],
            'Direction' => $feature['properties']['Direction'],
            'Coordinate' => $feature['geometry']['coordinates'],
            'Limit' => $feature['properties']['Limit'],
            'RegionName' => $feature['properties']['RegionName'],
            'Type' => $feature['properties']['Type']
        ];
    }, $filtered);

    // 輸出。
    echo json_encode(array_values($organized), JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}