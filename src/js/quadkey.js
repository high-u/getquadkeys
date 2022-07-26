const quadkeytools = require('quadkeytools');

// [緯度経度から2地点間の距離 (km) を計算する JavaScript - Qiita](https://qiita.com/kawanet/items/a2e111b17b8eb5ac859a)

const getDistance = (lonLat1, lonLat2) => {
  const R = Math.PI / 180;

  const lat1 = lonLat1[1] * R;
  const lon1 = lonLat1[0] * R;
  const lat2 = lonLat2[1] * R;
  const lon2 = lonLat2[0] * R;

  return 6378137 * Math.acos(Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1) + Math.sin(lat1) * Math.sin(lat2));
}

const getZoomLevel = (lonLat1, lonLat2) => {

  // Level 決定用の配列作成
  const coefficient = 1; // 0 to 2
  const aaa = [...Array(27)].map((e, i, a) => 2 ** (a.length - coefficient - i));
  const dis = getDistance(lonLat1, lonLat2);
  const level = aaa.filter(e => e > dis).length;
  return level;

}

const toQuadkey = (lat, lon, zoom_level) => {
  // 緯度経度からタイル座標に変換
  const x = (lon / 180 + 1) * (2 ** zoom_level) / 2;
  const xtile = Math.floor(x);
  const y = ((-1 * Math.log(Math.tan((45 + lat / 2) * Math.PI / 180)) + Math.PI) * (2 ** zoom_level) / (2 * Math.PI));
	const ytile = Math.floor(y);

  // タイル座標から quadkey に変換
  let quadKey = "";
  for (let i = zoom_level; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i-1);
    if ((xtile & mask) != 0) {
      digit++;
    }
    if ((ytile & mask) != 0) {
      digit++;
      digit++;
    }
    quadKey += digit.toString(10);
  }
  return quadKey;
};

// forward: 右と下の場合は 1, 左と上の場合は -1
// xxx: "" or "0"
// yyy: "" or "0"
const nextTile = (quadkey, forward, xxx, yyy) => {

  const l = quadkey.length;
  const qNum = parseInt(quadkey, 4);
  const qB2 = qNum.toString(2);

  // 奇数桁だけ抜き出す（一番右が 1 桁目とする）
  // 1 度奇数桁になるようにする
  const a = `${"0".repeat(qB2.length % 2 + (xxx === "0" ? 1 : 0))}${qB2}`.split("").filter((e, i) => (i + 1) % 2).join("");
  const b = (parseInt(a, 2) + forward).toString(2);
  const c = `${"0".repeat(b.length % 2 + (xxx === "0" ? 1 : 0))}${b}`;
  const d = c.split("").reduce((previousValue, currentValue, currentIndex) => {
    const e = `${xxx}${currentValue}${yyy}`;
    return previousValue + e;
  }, "");
  const f = parseInt(d, 2);

  const g = `${"0".repeat(qB2.length % 2 + (xxx === "0" ? 1 : 0))}${qB2}`.split("").map((c, i) => ((i + 1) % 2) ? "0" : c).join("");
  const h = parseInt(g, 2);

  const result = (BigInt(h) ^ BigInt(f)).toString(4);
  // 桁数増えたら右側を削除
  return result.length > l ? result.substring(result.length - l, result.length) : result.padStart(l, "0");
}

const right = (quadkey) => {
  return nextTile(quadkey, 1, "0", "");
}
const left = (quadkey) => {
  return nextTile(quadkey, -1, "0", "");
}
const up = (quadkey) => {
  return nextTile(quadkey, -1, "", "0");
}
const bottom = (quadkey) => {
  return nextTile(quadkey, 1, "", "0");
}

const getTiles = (quadkeyTopLeft, quadkeyBottomRight) => {

  let h = new Array(quadkeyTopLeft);
  let v = new Array(quadkeyBottomRight);

  // 重複チェック
  // 交わるまで探す。いきなり交わるパターン、一周以上するパターンも考慮する。
  while (! h.concat(v).filter((element, index, array) => array.indexOf(element) !== array.lastIndexOf(element)).length) {
    h = [...h, right(h[h.length - 1])];
    v = [...v, up(v[v.length - 1])];
  }

  // 余分な要素の削除
  const hi = h.indexOf(v[v.length - 1]);
  const vi = v.indexOf(h[h.length - 1]);

  if (hi >= 0) {
    h = h.slice(0, hi + 1);
  } else if (vi >= 0) {
    v = v.slice(0, vi + 1);
  }

  // h か v をベースに、全タイル取得
  let a = [];
  for (let i = 0; i < h.length; i++) {
    let he = h[i];
    a = [...a, he];
    for (let j = 0; j < v.length - 1; j++) {
      he = bottom(he);
      a = [...a, he];
    }
  }
  return a;

};

// トースト的な
const eBody = document.getElementsByTagName("body").item(0);
const eDiv = document.createElement("div");
eDiv.id = "info-bar"; 
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute("viewBox", "0 0 24 24");
svg.setAttribute("width", "24");
svg.setAttribute("height", "24");
svg.setAttribute("fill", "#862e9c");
svg.style.margin = "0 0.5rem 0 0";
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute("d", "m2.095 19.886 9.248-16.5c.133-.237.384-.384.657-.384.272 0 .524.147.656.384l9.248 16.5c.064.115.096.241.096.367 0 .385-.309.749-.752.749h-18.496c-.44 0-.752-.36-.752-.749 0-.126.031-.252.095-.367zm9.907-6.881c-.414 0-.75.336-.75.75v3.5c0 .414.336.75.75.75s.75-.336.75-.75v-3.5c0-.414-.336-.75-.75-.75zm-.002-3c-.552 0-1 .448-1 1s.448 1 1 1 1-.448 1-1-.448-1-1-1z");
svg.append(path);
eDiv.append(svg);
eDiv.append(document.createTextNode("Place pins at the upper left and lower right edges of the rectangle."));
eDiv.style.backgroundColor = "#eebefa";
eDiv.style.color = "#862e9c";
eDiv.style.position = "fixed";
eDiv.style.display = "flex";
eDiv.style.alignItems = "center";
eDiv.style.justifyContent = "center";
eDiv.style.left = "0px";
eDiv.style.width = "100%";
eDiv.style.padding = "1rem";
// eDiv.style.transition = "top 500ms 0ms";
eDiv.style.transition = "bottom 500ms 0ms";
eBody.append(eDiv);
const offsetHeight = eDiv.offsetHeight;
console.log({offsetHeight});
// eDiv.style.top = `-${offsetHeight}px`;
eDiv.style.bottom = "100vh";

const getQuadkeys = () => {

  // 経度（longitude）：（地図上の）縦の線、横に変化
  // 緯度（latitude）：（地図上の）横の線、縦に変化

  const lat1 = document.getElementById("lat1").value;
  const lon1 = document.getElementById("lon1").value;
  const lat2 = document.getElementById("lat2").value
  const lon2 = document.getElementById("lon2").value;

  console.log(`${lat1} < ${lat2} || ${lon1} > ${lon2}`);
  if ((lat1 < lat2) || (lon1 > lon2)) {
    
    // トースト的な、の表示
    const infoBar = document.querySelector("#info-bar");
    // infoBar.style.top = `0px`;
    infoBar.style.bottom = `calc(100vh - ${infoBar.offsetHeight}px)`;
    infoBar.style.filter = "drop-shadow(0 0 0.5rem rgba(0, 0, 0, 0.5))";
    infoBar.style.zIndex = "99999";
    setTimeout(() => {
      // トースト的な、を閉じる
      const infoBarHeight = infoBar.offsetHeight;
      // infoBar.style.top = `-${infoBarHeight}px`;
      infoBar.style.bottom = "100vh";
    }, 10000);
    setTimeout(() => {
      // トースト的な、が閉じたらシャドーを消す
      infoBar.style.filter = `none`;
    }, 10500); // transition = "top 500ms 0ms";

    return 0;
  }

  const pointTopLeft = [parseFloat(lon1) , parseFloat(lat1)];
  const pointBottomRight = [parseFloat(lon2), parseFloat(lat2)];

  
  const quadkeyLevel = document.getElementById("level").value;
  const levelManually = document.getElementById("level-manually").checked;
  
  const zl = ((level, manually) => {
    if (manually) {
      return level;
    } else {
      return getZoomLevel(pointTopLeft, pointBottomRight); 
    }
  })(quadkeyLevel, levelManually);

  console.log({zl}, {quadkeyLevel}, {levelManually});

  const quadkeyTopLeft = toQuadkey(pointTopLeft[1], pointTopLeft[0], zl);
  const quadkeyBottomRight = toQuadkey(pointBottomRight[1], pointBottomRight[0], zl);

  const tiles = getTiles(quadkeyTopLeft, quadkeyBottomRight);

  const aaa = tiles.map((e) => {
    const b = quadkeytools.bbox(e);
    return [
      [b.min.lng, b.min.lat],
      [b.min.lng, b.max.lat],
      [b.max.lng, b.max.lat],
      [b.max.lng, b.min.lat],
      [b.min.lng, b.min.lat]
    ];
  });

  const tilesarea = document.getElementById("tilesarea");
  tilesarea.replaceChildren();
  const ul = document.createElement("ul");
  const lis = tiles.map((e) => {
    const li = document.createElement("li");
    li.append(document.createTextNode(e))
    return li;
  });
  ul.replaceChildren(...lis);
  tilesarea.append(ul);

  var myPolygons = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "popupContent": "<p>丸の内ビルディングです。</p>"
        },
        "geometry": {
          "type": "Polygon",
          "coordinates": aaa
        }
      }
    ]
  };

  if (qLayer !== undefined) {
    qLayer.clearLayers();
  }
  
  qLayer = L.geoJSON(myPolygons, 
    {
      onEachFeature: function onEachFeature(
        feature,
        layer
      ){
        if(feature.properties && feature.properties.popupContent){
          layer.bindPopup(feature.properties.popupContent);
        }
      },
      style: function polystyle(feature) {
        return {
          fillColor: '#364fc7',
          fillOpacity: 0.3,
          weight: 2,
          color: 'white',
          opacity: 1
        }
      }
    }
  );
  qLayer.addTo(mymap);

}
document.getElementById("result").onclick = getQuadkeys;

var mymap = L.map('map').setView([35.6775, 139.716500], 16);
L.tileLayer(
  // 'https://{s}.tile.osm.org/{z}/{x}/{y}.png', // http だと、 chrome で 403 エラーが出る。safari だと地図が表示される。
  // ここから拝借 https://github.com/gsi-cyberjapan/gsimaps/blob/gh-pages/layers_txt/layers0.txt
  // 'https://maps.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png?_=20210915a',
  'https://maps.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
  // 'https://maps.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png?_=20210915a',
  {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
    minZoom: 2
  }
).addTo(mymap);

let qLayer;
let markers = [];

let popupOpt = {autoClose:false,closeOnClick:false,closeButton:true,minWidth:0,};
var popup = L.popup(popupOpt);

const pointTopLeft = [parseFloat(document.getElementById("lon1").value) , parseFloat(document.getElementById("lat1").value)];
const pointBottomRight = [parseFloat(document.getElementById("lon2").value), parseFloat(document.getElementById("lat2").value)];

var sampleIcon = L.icon({
  iconUrl: './images/pin.svg',
  iconRetinaUrl: './images/pin.svg',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});
var sampleIcon2 = L.icon({
  iconUrl: './images/pin2.svg',
  iconRetinaUrl: './images/pin2.svg',
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});

markers[0] = L.marker([pointTopLeft[1], pointTopLeft[0]], {draggable: 'true', icon: sampleIcon});
markers[0].addTo(mymap);
markers[1] = L.marker([pointBottomRight[1], pointBottomRight[0]], {draggable: 'true', icon: sampleIcon2});
markers[1].addTo(mymap);

markers[0].on('dragend', function(event) {
  var position = this.getLatLng();
  this.setLatLng(position, {
    draggable: 'true'
  }).bindPopup(position).update();
  document.getElementById("lat1").value = Math.floor(position.lat * 1000000) * 0.000001;
  document.getElementById("lon1").value = Math.floor(position.lng * 1000000) * 0.000001;
});
markers[1].on('dragend', function(event) {
  var position = this.getLatLng();
  this.setLatLng(position, {
    draggable: 'true'
  }).bindPopup(position).update();
  document.getElementById("lat2").value = Math.floor(position.lat * 1000000) * 0.000001;
  document.getElementById("lon2").value = Math.floor(position.lng * 1000000) * 0.000001;
});

document.getElementById("level").disabled = true;
document.getElementById("level-manually").onchange = (e) => {
  console.log(JSON.stringify(e));
  console.log("checked", document.getElementById("level-manually").checked);
  if (document.getElementById("level-manually").checked) {
    document.getElementById("level").disabled = false;
  } else {
    document.getElementById("level").disabled = true;
  }
}


getQuadkeys();

