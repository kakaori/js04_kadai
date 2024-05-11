function GetMap() {
    const map = new Microsoft.Maps.Map("#myMap", {
      center: new Microsoft.Maps.Location(35.6895, 139.6917), // 東京の座標
      zoom: 10
    });

    const apiUrl = "https://ja.wikipedia.org/w/api.php";
    const category = "Category:令和時代の殺人事件";
    const queryUrl = `${apiUrl}?origin=*&action=query&format=json&list=categorymembers&cmtitle=${encodeURIComponent(category)}&cmlimit=50`;

    function fetchGeocoding(address) {
      const bingMapsKey = "As9A4gB4JEOrJjHl6nq84lsNltpywnNg0E_0ZYbMQpBmLoYDhPpMuRgIt99ZFonT"; // ここにBing Maps APIのキーを入力してください
      const geocodingUrl = `https://dev.virtualearth.net/REST/v1/Locations?q=${encodeURIComponent(address)}&key=${bingMapsKey}`;

      return fetch(geocodingUrl)
        .then(response => response.json())
        .then(data => {
          if (data.resourceSets && data.resourceSets.length > 0 && data.resourceSets[0].resources && data.resourceSets[0].resources.length > 0) {
            const location = data.resourceSets[0].resources[0].point.coordinates;
            return new Microsoft.Maps.Location(location[0], location[1]);
          } else {
            throw new Error("住所情報が見つかりませんでした。");
          }
        });
    }

    function fetchPageInfo(title) {
      const pageUrl = `${apiUrl}?origin=*&action=parse&format=json&page=${encodeURIComponent(title)}&prop=text&section=0`;

      return fetch(pageUrl)
        .then(response => response.json())
        .then(data => {
          const pageContent = data.parse.text["*"];
          const pageExtract = $(pageContent).find('p').text();
          const truncatedExtract = pageExtract.length > 78 ? pageExtract.slice(0, 75) + "..." : pageExtract;
          return truncatedExtract;
        });
    }

    fetch(queryUrl)
      .then(response => response.json())
      .then(data => {
        const categoryMembers = data.query.categorymembers;
        const infoContainer = $("#infoContainer");

        categoryMembers.forEach(member => {
          if (member.ns === 0) {
            fetchGeocoding(member.title)
              .then(location => {
                const pin = new Microsoft.Maps.Pushpin(location, {
                  title: member.title,
                  subTitle: member.title
                });
                map.entities.push(pin);
                // Pushpinにクリックイベントを追加
                Microsoft.Maps.Events.addHandler(pin, 'click', function(e) {
                    // クリックイベントが発生した際の処理
                    const targetId = member.title.replace(/ /g, "_");
                    const targetElement = $("#" + targetId);
                    if (targetElement.length) {
                        $('html, body').animate({
                            scrollTop: targetElement.offset().top
                        }, 500); // 1000はアニメーションのスピードです（ミリ秒）
                    }
                });
                
                // ページの情報を追加
                fetchPageInfo(member.title)
                  .then(pageExtract => {
                    const pageLink = $('<a class="font-bold underline hover:no-underline">').attr("href", "https://ja.wikipedia.org/wiki/" + encodeURIComponent(member.title)).attr("target", "_blank").text(member.title);
                    const listItem = $('<div class="p-4 border-dashed border-b">').attr("id", member.title.replace(/ /g, "_")).append(pageLink).append("<br>").append(pageExtract); // listItemにIDを付ける
                    infoContainer.append(listItem);
                  })
                  .catch(error => {
                    console.error("ページ情報の取得エラー:", error);
                  });
              })
              .catch(error => {
                console.error("住所情報の取得エラー:", error);
              });
          }
        });
      })
      .catch(error => {
        console.error("APIリクエストエラー:", error);
      });
  }