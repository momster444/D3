var fs = require("fs");

var gulp  = require('gulp'),  
    gutil = require('gulp-util'),
    clean = require('gulp-clean'),
    exec  = require('child_process').exec,
    _     = require('lodash'),
    iconv = require('iconv-lite');

var shpPath = {  
    ctprvn : {
        source : 'map/src/CTPRVN_201703/TL_SCCO_CTPRVN.shp',
        convert : 'map/src/CTPRVN_201703/TL_SCCO_CTPRVN_CONVERT.shp',
        json : 'map/dist/ctprvn.json'
    },
    sig : {
        source : 'map/src/SIG_201703/TL_SCCO_SIG.shp',
        convert : 'map/src/SIG_201703/TL_SCCO_SIG_CONVERT.shp',
        json : 'map/dist/sig.json'
    },
    emd : {
        source : 'map/src/EMD_201703/TL_SCCO_EMD.shp',
        convert : 'map/src/EMD_201703/TL_SCCO_EMD_CONVERT.shp',
        json : 'map/dist/emd.json'
    }
}

gulp.task('default', ['convert']);

gulp.task('clean-shp', function() {  
    return gulp.src(['map/dist/*.json', 'map/src/**/*_CONVERT.*'])
        .pipe(clean());
});

gulp.task('clean-split', function() {  
    if (!fs.existsSync('map/dist/sig')){
        fs.mkdirSync('map/dist/sig');
    }

    if (!fs.existsSync('map/dist/emd')){
        fs.mkdirSync('map/dist/emd');
    }

    return gulp.src(['map/dist/sig/*.json', 'map/dist/emd/*.json'])
        .pipe(clean());
});

gulp.task('convert', ['clean-shp'], function() {  
    for (var key in shpPath) {
        console.log('==========');

        mapshaper(key, shpPath[key].source);
    }
});

gulp.task('split', ['clean-split'], function() {  
    // 시군구 geojson 생성
    splitGeojson('sig');

    // 동 geojson 생성
    splitGeojson('emd');
});

function mapshaper(key) {  
    var command = 'mapshaper -i '
                + shpPath[key].source
                + ' encoding=euc-kr -simplify weighted 0.5% -o format=shapefile '
                + shpPath[key].convert;

    console.log(command);

    exec(command, function (error, stdout, stderr) {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }

        console.log(stdout);
        console.log(stderr);

        console.log('=> convert size')
        console.log('%s : %d bytes', shpPath[key].source,  fs.statSync(shpPath[key].source).size);
        console.log('%s : %d bytes', shpPath[key].convert, fs.statSync(shpPath[key].convert).size);
        console.log('=>')

        ogr2ogr(key);
    });
}

function ogr2ogr(key) {  
    var command = 'ogr2ogr -f GeoJSON -lco COORDINATE_PRECISION=3 "'
                + shpPath[key].json
                +'" "' + shpPath[key].convert + '"';

    console.log(command);

    exec(command, function (error, stdout, stderr) {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }

        console.log(stdout);
        console.log(stderr);

        console.log('=> convert json size')
        console.log('%s : %d bytes', shpPath[key].json, fs.statSync(shpPath[key].json).size);
        console.log('=>')
    });
}

function splitGeojson(type) {  
    console.log("\n *Split geoJSON START* \n");
    console.log(type);

    var fileName = shpPath[type].json;
    //var exception = [ "47940" ];
    var exception = [];

    // 시군구 데이터 sido 별로 자르기
    var contents = fs.readFileSync(fileName);
    var features ={};
    contents = iconv.decode(contents, 'utf-8');

    var jsonContent = JSON.parse(contents);

    for (var key in jsonContent.features) {
        var feature = jsonContent.features[key];
        var subKey, cd, name;

        if (type == 'sig') {
            cd = feature.properties.SIG_CD;
            name = feature.properties.SIG_KOR_NM;
            subKey = feature.properties.SIG_CD.substr(0, 2);
        } else if (type == 'emd') {
            cd = feature.properties.EMD_CD;
            name = feature.properties.EMD_KOR_NM;
            subKey = feature.properties.EMD_CD.substr(0, 5);
        }

        console.log(`feature.properties.cd: ${cd}, feature.properties.name: ${name}`);

        if (features.hasOwnProperty(subKey)) {
            if (!_.has(exception, cd)) {
                features[subKey].push(feature);
            }
        } else {
            features[subKey] = [];

            if (!_.has(exception, cd)) {
                features[subKey].push(feature);
            }
        }
    }

    for (var key in features) {
        var featuresCollection = _.template('{"type": "FeatureCollection", "features": [ \
                <% _.forEach(iterator, function(val, index, list) { %> \
                \n  <%= JSON.stringify(val) %><% \
                if (index < list.length - 1) { \
                %>, <% \
                } \
                }); %> \
            \n]}');

        var jsonStr = featuresCollection({
            'iterator': features[key]
        });

        // split json파일 생성
        fs.writeFileSync("map/dist/" + type + "/" + key + ".json", jsonStr);
    }

    console.log("\n *EXIT* \n");
}