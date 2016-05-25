//<![CDATA[

// Declare the global variables.

	var listImg = [{fru: 3, id: "MCH1", img: "img/mchcard.jpg", focus: "img/mchcardselect.png"},
		       {fru: 5, id: "AMC1", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
	               {fru: 6, id: "AMC2", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
                       {fru: 7, id: "AMC3", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
		       {fru: 8, id: "AMC4", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
		       {fru: 9, id: "AMC5", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
		       {fru: 10, id: "AMC6", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
		       {fru: 11, id: "AMC7", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
	               {fru: 12, id: "AMC8", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
                       {fru: 13, id: "AMC9", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
		       {fru: 14, id: "AMC10", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
		       {fru: 15, id: "AMC11", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
		       {fru: 16, id: "AMC12", img: "img/GLIB.png", focus: "img/GLIBselect.png"},
		       {fru: 30, id: "MCH2", img: "img/mchcard.jpg", focus: "img/mchcardselect.png"},
		       {fru: 40, id: "CU1", img: "img/fanbox.jpg", focus: "img/redcardbox.jpg"},
		       {fru: 41, id: "CU2", img: "img/fanbox.jpg", focus: "img/redcardbox.jpg"},
		       {fru: 50, id: "PM1", img: "img/powerunit.jpg", focus: "img/powerunitselect.png"},
		       {fru: 51, id: "PM2", img: "img/powerunit.jpg", focus: "img/powerunitselect.png"}];

	var currentHW = {crate: 0, card: 0, sensor: false};
	var listHW = {crates: [], crate: []};
	var store = {name: "", datasource: [], fru: 0, crateno: 0, sensor: ""};
	var RefreshInterval = 10000; //Time in milliseconds
	var TimeOut = 10000; //Time in milliseconds
	var plotPOINTSLIMIT = 10;
	var windowStore = [];
	

	function LoadTree() 
        {
		$(document.createElement('div')).attr("id","chartContainer").attr("style","max-width:900px;height: 300px;").css("visibility", "hidden").appendTo(document.body);
		hideImages();
		
		var ul = $(document.createElement('ul')).attr("id","ulcrates");
		var crateDATA = sendREQUEST("cmd=LIST_CRATES");
		if (crateDATA.error){return;}
		var crates = crateDATA.data;
		var iCrate = 0;
		$(crates).each(function(indexCrate, crate) {
			indexCrate = iCrate;
			if (!crate.connected){return;}
			iCrate++;
			var li_crate = $(document.createElement('li')).attr("id","licrate"+crate.crateno).append($(document.createElement('a')).text(crate.description)).click(function(event) {event.stopPropagation(); showInfo("crate",{crateno: crate.crateno});});
			var ul_crate = $(document.createElement('ul')).attr("id","ulcrate"+crate.crateno);
			listHW.crates.push(crate.crateno);
			listHW.crate.push({cards: [], card: []});
			$.when($.ajax({url: "json?cmd=LIST_CARDS&crate="+crate.crateno, type: 'get', dataType: 'text', timeout: TimeOut})).then(function(rawcardDATA, textStatus, jqXHR){
				if (jqXHR.status != 200){return;} 
				var cardDATA = JSON.parse(rawcardDATA);
				if (cardDATA.error){return;}
				var cards = cardDATA.data;
				$(cards).each(function(indexCard, card) {
					var li_card = $(document.createElement('li')).attr("id","lifru"+card.fru).append($(document.createElement('a')).text(card.name)).click(function(event) {event.stopPropagation(); showInfo("card",{crateno: crate.crateno, fru: card.fru});});
					var ul_card = $(document.createElement('ul')).attr("id","ulfru"+card.fru);
					var sensorDATA = sendREQUEST("cmd=LIST_SENSORS&crate="+crate.crateno+"&fru="+card.fru);
					if (sensorDATA.error){return;}
					var sensors = sensorDATA.data;
					listHW.crate[indexCrate].cards.push(card.fru);
					listHW.crate[indexCrate].card.push({sensors: [], sensor: []});
					$(sensors).each(function(indexSensor, sensor) {
						var li_sensor = $(document.createElement('li')).attr("id","lisensor"+sensor.name).append($(document.createElement('a')).text(sensor.name)).click(function(event) {event.stopPropagation(); showInfo("sensor",{crateno: crate.crateno, fru: card.fru, sensor: sensor.name});}); 
						ul_card.append(li_sensor);
						listHW.crate[indexCrate].card[indexCard].sensors.push(sensor.name);
					});
					li_card.append(ul_card);
					ul_crate.append(li_card);
				});
				li_crate.append(ul_crate);
				ul.append(li_crate);
			});
		});
		var nav = $('<nav>').attr("id","nav").appendTo($('#tree')).css('cursor', 'pointer'); 
		var ul_main = $(document.createElement('ul')).attr("id","navigation");
		var li = $(document.createElement('li')).attr("id","crates").append($(document.createElement('a')).text("crates")).click(function(event) {event.stopPropagation(); updateWEBPAGE();});
		li.append(ul);
		ul_main.append(li);
		nav.append(ul_main);
		setInterval(updateWEBPAGE, RefreshInterval);	
	}

	function showInfo(mode,para) 
        {	
		$('#info').empty();
		$('#graph').empty();	
		setCursorByID("body","wait"); 
		var table = $(document.createElement('table')).appendTo($('#info'));
		var data = {title: "", field: []};

		if (mode == "crate")
		{
			$.when($.ajax({url: "json?cmd=GET_CRATE_INFO&crate="+para.crateno, type: 'get', dataType: 'text', timeout: TimeOut, async: true})).then(function(rawcrateDATA, textStatus, jqXHR){
				if (jqXHR.status != 200){return;} 
				var crateDATA = JSON.parse(rawcrateDATA);
				//var crateDATA = sendREQUEST("cmd=GET_CRATE_INFO&crate="+para.crateno);
				if (crateDATA.error)
				{
					data.field = ["Crate Number = " + para.crateno, "ERROR = " + crateDATA.message];
					buildTable(table, data);
					setCursorByID("nav","pointer");
					return;
				}
				var crateInfo = crateDATA.data;
				var cards = searchListHW(para);
				data.title = "CRATE INFORMATION";
				data.field = ["Crate Name = " + crateInfo.description, "Crate Number = " + crateInfo.crateno, "MCH = " + crateInfo.mch, "Number of Cards = " + (cards.length - 4) ];				
				buildTable(table, data);
				setCursorByID("body","auto"); 
				currentHW = {crate: para.crateno, card: 0, sensor: false};
			});
		}
		if (mode == "card")
		{
			$.when($.ajax({url: "json?cmd=GET_CARD_INFO&crate="+para.crateno+"&fru="+para.fru, type: 'get', dataType: 'text', timeout: TimeOut, async: true})).then(function(rawcardDATA, textStatus, jqXHR){
				if (jqXHR.status != 200){return;} 
				var cardDATA = JSON.parse(rawcardDATA);
				//var cardDATA = sendREQUEST("cmd=GET_CARD_INFO&crate="+para.crateno+"&fru="+para.fru);
				if (cardDATA.error)
				{
					data.field = ["FRU = "+para.fru, "Crate Number = "+para.crateno, "ERROR = "+cardDATA.message];
					buildTable(table, data);
					showImages(para); 
					setCursorByID("nav","pointer");
					return;
				}
				data.title = "CARD INFORMATION";
				$('#graph').empty();
				var list = $(document.createElement('table')).appendTo($('#graph'));
				var sensors = searchListHW(para);
				var cardInfo = cardDATA.data;
				data.field = ["Card Name = "+cardInfo.name, "FRU = "+cardInfo.fru, "Card MState = "+cardInfo.mstate, "Card Type = "+cardInfo.position.type, "Crate Number = "+cardInfo.crate, "Site Number = "+cardInfo.position.sitenum, "Site Type = "+cardInfo.position.sitetype, "Slot Number = "+cardInfo.position.slot, "Tier Number = "+cardInfo.position.tier, "Number of Sensors = "+sensors.length];
				buildTable(table, data);
				list.append($(document.createElement('tr')).append($(document.createElement('td')).text("LIST OF SENSORS")));
				$(sensors).each(function(indexSensor, sensor) {
					list.append($(document.createElement('tr')).append($(document.createElement('td')).css('cursor', 'pointer').hover(function(){$(this).css("background-color","#CCCCFF")}, function(){$(this).css("background-color","white")}).click(function() {showInfo("sensor",{crateno: para.crateno, fru: para.fru, sensor: sensor});}).text(sensor)));
				}); 
				setCursorByID("body","auto"); 
				currentHW = {crate: para.crateno, card: para.fru, sensor: false};
			});
		}
		if (mode == "sensor")
		{
			$.when($.ajax({url: "json?cmd=READ_SENSOR&crate="+para.crateno+"&fru="+para.fru+"&sensor="+para.sensor, type: 'get', dataType: 'text', timeout: TimeOut, async: true})).then(function(rawsensorDATA, textStatus, jqXHR){
				if (jqXHR.status != 200){return;} 
				var sensorDATA = JSON.parse(rawsensorDATA);
				data.title = "SENSOR INFORMATION";
				//var sensorDATA = sendREQUEST("cmd=READ_SENSOR&crate="+para.crateno+"&fru="+para.fru+"&sensor="+para.sensor);
				if (sensorDATA.error)
				{
					data.field = ["Sensor Name = "+para.sensor, "FRU = "+para.fru, "Crate Number = "+para.crateno, "ERROR = "+sensorDATA.message];
					buildTable(table, data);			
					showImages(para);
					setCursorByID("nav","pointer");
					return;
				}
				var sensorInfo = sensorDATA.data;
				data.field = ["Sensor Name = "+sensorInfo.name, "FRU = "+sensorInfo.fru, "Crate Number = "+sensorInfo.crate, "Sensor Type = "+sensorInfo.type];
					
				if(sensorInfo.type=="Threshold")
				{
					var threshold = {lnc: -9999, lc: -9999, lnr: -9999, unc: -9999, uc: -9999, unr: -9999};
					//var thresholdInfo = sendREQUEST("cmd=GET_SENSOR_THRESHOLDS&crate="+para.crateno+"&fru="+para.fru+"&sensor="+para.sensor).data.thresholds;
					//if(thresholdInfo.lnc) threshold.lnc = thresholdInfo.lnc;
					//if(thresholdInfo.lc) threshold.lnc = thresholdInfo.lc;
					//if(thresholdInfo.lnr) threshold.lnc = thresholdInfo.lnr;
					//if(thresholdInfo.unc) threshold.lnc = thresholdInfo.unc;
					//if(thresholdInfo.uc) threshold.lnc = thresholdInfo.uc;
					//if(thresholdInfo.unr) threshold.lnc = thresholdInfo.unr;	
					data.field.push("Sensor Value = <a id=\"value\">"+sensorInfo.value+"</a>");
					data.field.push("Sensor Units = "+sensorInfo.longunits);
						
					if(sensorInfo.shortunits == "V"){
						if(threshold.lnc == -9999) threshold.lnc = 0;
						if(threshold.lc == -9999) threshold.lc = -5;
						if(threshold.lnr == -9999) threshold.lnr = -10;
						if(threshold.unc == -9999) threshold.unc = 15;
						if(threshold.uc == -9999) threshold.uc = 17;
						if(threshold.unr == -9999) threshold.unr = 20;
						buildGraph("circular", threshold, sensorInfo.value);
						store.name = "Voltage (V)";
					}
					if(sensorInfo.shortunits=="A"){
						if(threshold.lnc == -9999) threshold.lnc = 0;
						if(threshold.lc == -9999) threshold.lc = -0.5;
						if(threshold.lnr == -9999) threshold.lnr = -1.0;
						if(threshold.unc == -9999) threshold.unc = 1.5;
						if(threshold.uc == -9999) threshold.uc = 1.7;
						if(threshold.unr == -9999) threshold.unr = 2.0;
						buildGraph("circular", threshold, sensorInfo.value);
						store.name = "Ampere (A)";
					}
					if(sensorInfo.shortunits=="C"){
						if(threshold.lnc == -9999) threshold.lnc = 10;
						if(threshold.lc == -9999) threshold.lc = 5;
						if(threshold.lnr == -9999) threshold.lnr = 0;
						if(threshold.unc == -9999) threshold.unc = 40;
						if(threshold.uc == -9999) threshold.uc = 45;
						if(threshold.unr == -9999) threshold.unr = 50;
						buildGraph("linear", threshold, sensorInfo.value);
						store.name = "Temperature (°C)"; 
					}

					var currentdate = new Date();
					var curtime = currentdate.getHours() + ":" + currentdate.getMinutes() + ":" +  currentdate.getSeconds();
					if (store.fru == para.fru && store.crateno == para.crateno && store.sensor == para.sensor)
					{
						store.datasource.push({data: sensorInfo.value, time: curtime});
					}else{
						store.datasource = [];
						store.datasource.push({data: sensorInfo.value, time: curtime});
					}
					store.fru = para.fru; 
					store.crateno = para.crateno;
					store.sensor = para.sensor;
					if (store.datasource.length > plotPOINTSLIMIT)
					{
						store.datasource.shift();
					}
					buildChart(store);
					$('#graph').append($(document.createElement('button')).text("Plot!").click(function(event) 
					{
						event.stopPropagation(); 
						var myWindow = window.open('','','width=800,height=500'); 							setTimeout(function(){
							$(myWindow.document.body).html($('#chartContainer').css("visibility", "visible").html());
							$('#chartContainer').css("visibility", "hidden");
						},500); 
						myWindow.onunload = function(event){
							var source = event.target || event.srcElement;
							$(windowStore).each(function(indexWindow, window) {
        							if (source == window || window.closed || !window){
									windowStore.splice(indexWindow, 1);
								}
    							});
						}
						windowStore.push(myWindow);
					}));

				}else{
					data.field.push("Sensor Raw Value = <a id=\"rawvalue\">"+sensorInfo.raw+"</a>");
				}
				buildTable(table, data);			
				setCursorByID("body","auto"); 
				currentHW = {crate: para.crateno, card: para.fru, sensor: para.sensor};	
			});
		}	
		showImages(para);
		return;	
	}	

	function showImages(para) 
        {
		var cards = searchListHW({crateno: para.crateno});
		if (currentHW.crate != para.crateno)
		{
			hideImages();
			$(cards).each(function(indexCard, card)
			{
				var cardImg = searchListImg({fru: card});
				$("#"+cardImg.id).css("visibility", "visible");
			});
		}

		if (para.fru){
			var cardImg = searchListImg({fru: para.fru});
			changeIt(cardImg.id);
		}
		return;
	}

	function buildTable(table, data)
	{
		table.append($(document.createElement('tr')).append($(document.createElement('td')).text(data.title)));
		for (var i = 0; i < data.field.length; i++)
		{
			table.append($(document.createElement('tr')).append($(document.createElement('td')).html(data.field[i]))); 
		}
		return;
	}

	function buildGraph(type, threshold, value)
	{
		if (type == "circular")
		{	
			$('#graph').append($(document.createElement('div')).attr("id","CircularGaugeContainer").attr("style","width:200pt"));
			$(function () {
				$("#CircularGaugeContainer").dxCircularGauge({
    					scale: {
    						startValue: threshold.lnr-2,
    						endValue: threshold.unr+2,
						majorTick: {
							color: 'black'
						},
						 	minorTick: {
							visible: true,
							tickInterval: 1,
							color: 'black'
						}
    					},
    					needles: [{ value: value, color: 'blue', offset: 10}],
   					markers: [{ value: value, color: 'blue', offset: -5}],
					spindle: {color : 'blue'},
    					rangeContainer: {
						backgroundColor: "none",
    						ranges: [{
    							startValue: threshold.lnr-2,
    							endValue: threshold.lnr,
    							color: 'black'
    						}, {
    							startValue: threshold.lnr,
    							endValue: threshold.lc,
    							color: 'red'
    						}, {
    							startValue: threshold.lc,
    							endValue: threshold.lnc,
    							color: 'yellow'
    						}, {
    							startValue: threshold.lnc,
    							endValue: threshold.unc,
    							color: 'green'
    						}, {
    							startValue: threshold.unc,
    							endValue: threshold.uc,
    							color: 'yellow'
    						}, {
    							startValue: threshold.uc,
    							endValue: threshold.unr,
    							color: 'red'
    						}, {
    							startValue: threshold.unr,
    							endValue: threshold.unr+2,
    							color: 'black'
    						}],
						offset: -5
    					}
    				});
			});
		}
		if (type == "linear")
		{
			$('#graph').append($(document.createElement('div')).attr("id","LinearGaugeContainer").attr("style","width:100pt"));
			$(function () {
				$("#LinearGaugeContainer").dxLinearGauge({
					geometry: {
						orientation: 'vertical'
					},
    					scale: {
    						startValue: threshold.lnr-2,
    						endValue: threshold.unr+2,
						majorTick: {
							color: 'black'
						},
					 	minorTick: {
							visible: true,
							tickInterval: 1,
							color: 'black'
						}
    					},
    					needles: [{ value: value, color: 'blue', offset: 10}],
   					markers: [{ value: value, color: 'blue', offset: -5}],
					rangeBars: [{value: value }],
    					rangeContainer: {
						backgroundColor: "none",
    						ranges: [{
    							startValue: threshold.lnr-2,
    							endValue: threshold.lnr,
    							color: 'black'
    						}, {
    							startValue: threshold.lnr,
    							endValue: threshold.lc,
    							color: 'red'
    						}, {
    							startValue: threshold.lc,
    							endValue: threshold.lnc,
    							color: 'yellow'
    						}, {
    							startValue: threshold.lnc,
    							endValue: threshold.unc,
    							color: 'green'
    						}, {
    							startValue: threshold.unc,
    							endValue: threshold.uc,
    							color: 'yellow'
    						}, {
    							startValue: threshold.uc,
    							endValue: threshold.unr,
    							color: 'red'
    						}, {
    							startValue: threshold.unr,
    							endValue: threshold.unr+2,
    							color: 'black'
    						}],
						offset: -5
    					}
    				});
			});
		}
		return;
	}

	function buildChart(para) 
        {		
		for (var i = 0; i < 5; i++)
		{
		$(function () {
			$("#chartContainer").dxChart({
    				dataSource: para.datasource,
				title: {
					text: "Crate: " + para.crateno + " , FRU: " + para.fru + " , Sensor: " + para.sensor 
				},
    				commonSeriesSettings: {
					type: "spline",
        				argumentField: "time",
					label: {
						visible: true,
						connector: {
							visible: true
						}
					}
				},
    				commonAxisSettings: {
        				grid: {
            					visible: true
        				}
    				},
    				series: [{ valueField: "data", name: para.sensor, axis: "data"}],
    				valueAxis: [{
        				grid: {
            					visible: true
        				},
        				name: "data",
					title: {
           					text: para.name
        				}
				}],
    				legend: {
        				verticalAlignment: "bottom",
        				horizontalAlignment: "center"
    				},
    				commonPaneSettings: {
        				border:{
            					visible: true,
            					bottom: true
        				}
    				}
			});
		});
		}
		return;
	}


	function hideImages() 
        {
		$(document.getElementsByClassName('image')).css("visibility", "hidden");
		$(listImg).each(function(indexCard, card)
		{
			$("#"+card.id).attr("src",card.img);
		});
		return;
	}
		
	function changeIt(objID)
	{
		var selectedCardInfo = searchListImg({id: objID});
		var selectedCard = document.getElementById(objID);
		selectedCard.setAttribute("src",selectedCardInfo.focus);
		if (currentHW.card > 0 && selectedCardInfo.fru != currentHW.card)
		{
			var oldCardInfo = searchListImg({fru: currentHW.card});
			var oldCard = document.getElementById(oldCardInfo.id);
			oldCard.setAttribute("src",oldCardInfo.img);
		}
		return;
	}

	function selectIt(objID)
	{
		changeIt(objID);
		var cardImg = searchListImg({id: objID});
		showInfo("card",{crateno: currentHW.crate, fru: cardImg.fru});
		return;
	}
		

	function sendREQUEST(request)
	{
		var result = null;
//		var scriptUrl = "cgi-bin/sysmgr.cgi?"+request;
		var scriptUrl = "json?"+request;
     		$.ajax({
        		url: scriptUrl,
			type: 'get',
        		dataType: 'text',
			async: false,
        		success: function(data) {
				result = JSON.parse(data);
        		} 
     		});
		if (result)
		{
			return result;
		}else{
			return {error: "server_error", message: "NO DATA RETURNED FROM SERVER"};
		}
	}

	function searchListHW(value)
	{
		if (!value.crateno){return listHW.crates;}
		var crateFound = false;
		for (var i = 0; i < listHW.crates.length; i++)
		{
			if (value.crateno == listHW.crates[i])
			{
				crateFound = true;
				if (!value.fru){return listHW.crate[i].cards;}
				var cardFound = false;
				for (var j = 0; j < listHW.crate[i].cards.length; j++)
				{
					if (value.fru == listHW.crate[i].cards[j])
					{
						cardFound = true;
						if (!value.sensor){return listHW.crate[i].card[j].sensors;}
						var sensorFound = false;
						for (var k = 0; j < listHW.crate[i].card[j].sensors.length; k++)
						{
							if (value.sensor == listHW.crate[i].card[j].sensors[k])
							{
								sensorFound = true;
								return listHW.crate[i].card[j].sensors[k];
							}
						}
						if (!sensorFound){return false;}
					}
				}
				if (!cardFound){return false;}
			}
		}
		if (!crateFound){return false;}
	}

	function searchListImg(value)
	{
		for (var i = 0; i < listImg.length; i++)
		{
			var data = listImg[i];
			if (data.fru == value.fru || data.id == value.id)
			{
				return data;
			}
			
		}
		return;
	}

	function setCursorByID(id,cursorStyle) {
 		if (id == "body") {
			document.body.style.cursor = cursorStyle;
		}else{
			var elem;
			if (document.getElementById && (elem=document.getElementById(id)) ) {
  				if (elem.style) elem.style.cursor=cursorStyle;
 			}
		}		
		return;
	}

	function updateInfo(para) 
        {	
		$.when($.ajax({url: "json-bin/sysmgr.cgi?cmd=READ_SENSOR&crate="+para.crateno+"&fru="+para.fru+"&sensor="+para.sensor, type: 'get', dataType: 'text', timeout: TimeOut})).then(function(rawsensorDATA, textStatus, jqXHR){
			if (jqXHR.status != 200){return;} 
			var sensorDATA = JSON.parse(rawsensorDATA);
			if (sensorDATA.error){return;}
			var sensorInfo = sensorDATA.data;
					
			if(sensorInfo.type=="Threshold")
			{	
				$("#value").text(sensorInfo.value);
					
				if(sensorInfo.shortunits == "V" || sensorInfo.shortunits == "A"){
					$(function () {
						$("#CircularGaugeContainer").dxCircularGauge({
    							needles: [{ value: sensorInfo.value, color: 'blue', offset: 10}],
   							markers: [{ value: sensorInfo.value, color: 'blue', offset: -5}]
    						});
					});
				}
				if(sensorInfo.shortunits=="C"){
					$(function () {
						$("#LinearGaugeContainer").dxLinearGauge({
    							needles: [{ value: sensorInfo.value, color: 'blue', offset: 10}],
   							markers: [{ value: sensorInfo.value, color: 'blue', offset: -5}],
						        rangeBars: [{value: sensorInfo.value}]
    						});
					});
				}

				var currentdate = new Date();
				var curtime = currentdate.getHours() + ":" + currentdate.getMinutes() + ":" +  currentdate.getSeconds();
				if (store.fru == para.fru && store.crateno == para.crateno && store.sensor == para.sensor)
				{
					store.datasource.push({data: sensorInfo.value, time: curtime});
				}else{
					store.datasource = [];
					store.datasource.push({data: sensorInfo.value, time: curtime});
				}
				store.fru = para.fru; 
				store.crateno = para.crateno;
				store.sensor = para.sensor;
				if (store.datasource.length > plotPOINTSLIMIT)
				{
					store.datasource.shift();
				}

				currentHW = {crate: para.crateno, card: para.fru, sensor: para.sensor};	
			}else{
				$("#rawvalue").text(sensorInfo.raw);
			}
		});		
	}
			

	function updateWEBPAGE() {
		var ul = $("#ulcrates");
		var crateDATA = sendREQUEST("cmd=LIST_CRATES");
		if (crateDATA.error){return;}
		var crates = crateDATA.data;
		var currentCrates = searchListHW({});
		$(currentCrates).each(function(indexcurrentCrate, currentCrate) {
			var crateExist = false; 
			for (var i = 0; i < crates.length; i++)
			{
				if (currentCrate == crates[i].crateno && crates[i].connected)
				{
					crateExist = true;
					break;
				}
			}
			if (!crateExist)
			{
				ul.find("#licrate"+currentCrate).remove();
				listHW.crates.splice(indexcurrentCrate,1);
				listHW.crate.splice(indexcurrentCrate,1);
				if (currentHW.crate == currentCrate)
				{
					hideImages(); 
					$('#info').empty();
					$('#graph').empty();
					currentHW = {};
				} 
			}
		});
		var iCrate = 0;
		$(crates).each(function(indexCrate, crate) {
			indexCrate = iCrate;
			if (!crate.connected){return;}
			iCrate++;
			var attachCrate = false;
			if (!searchListHW({crateno: crate.crateno})){	
				var li_crate = $(document.createElement('li')).attr("id","licrate"+crate.crateno).append($(document.createElement('a')).text(crate.description)).click(function(event) {event.stopPropagation(); showInfo("crate",{crateno: crate.crateno});});
				var ul_crate = $(document.createElement('ul')).attr("id","ulcrate"+crate.crateno);
				listHW.crates.push(crate.crateno);
				listHW.crate.push({cards: [], card: []});
				currentCrates = searchListHW({});
				attachCrate = true;
			}else{
				var li_crate = $("#licrate"+crate.crateno);
				var ul_crate = $("#ulcrate"+crate.crateno);
			}

			var currentCards = searchListHW({crateno: crate.crateno});
			var indexCURCRATE = 0;
			for (var i = 0; i < currentCrates.length; i++)
			{
				if (currentCrates[i] == crate.crateno){
					indexCURCRATE = i;
					break;
				}
			}

			$.when($.ajax({url: "json?cmd=LIST_CARDS&crate="+crate.crateno, type: 'get', dataType: 'text', timeout: TimeOut})).then(function(rawcardDATA, textStatus, jqXHR){
				if (jqXHR.status != 200){return;} 
				var cardDATA = JSON.parse(rawcardDATA);
				if (cardDATA.error){return;}
				var cards = cardDATA.data;

				$(currentCards).each(function(indexcurrentCard, currentCard) {
					var cardExist = false; 
					for (var i = 0; i < cards.length; i++)
					{
						if (currentCard == cards[i].fru)
						{
							cardExist = true;
							break;
						}
					}
					if (!cardExist)
					{
						ul.find("#licrate"+crate.crateno).find("#lifru"+currentCard).remove();
						listHW.crate[indexCURCRATE].cards.splice(indexcurrentCard,1);
						listHW.crate[indexCURCRATE].card.splice(indexcurrentCard,1);
						var oldCardInfo = searchListImg({fru: currentCard});
						$(document.getElementById(oldCardInfo.id)).css("visibility", "hidden");
						if (currentHW.crate == crate.crateno && currentHW.card == currentCard)
						{
							$('#info').empty();
							$('#graph').empty();
							currentHW = {crate: crate.crateno};
						} 
					}
				});

				$(cards).each(function(indexCard, card) {
					var sensorDATA = sendREQUEST("cmd=LIST_SENSORS&crate="+crate.crateno+"&fru="+card.fru);
					if (sensorDATA.error){return;}
					var sensors = sensorDATA.data;
					var attachCard = false;
					if (!searchListHW({crateno: crate.crateno, fru: card.fru})){	
						var li_card = $(document.createElement('li')).attr("id","lifru"+card.fru).append($(document.createElement('a')).text(card.name)).click(function(event) {event.stopPropagation(); showInfo("card",{crateno: crate.crateno, fru: card.fru});});
						var ul_card = $(document.createElement('ul')).attr("id","ulfru"+card.fru);
						listHW.crate[indexCURCRATE].cards.push(card.fru);
						listHW.crate[indexCURCRATE].card.push({sensors: []});
						if (currentHW.crate == crate.crateno)
						{
							var newCardInfo = searchListImg({fru: card.fru});
							document.getElementById(newCardInfo.id).setAttribute("src",newCardInfo.img);
							$("#"+newCardInfo.id).css("visibility", "visible");
						} 
						currentCards = searchListHW({crateno: crate.crateno});
						attachCard = true;
					}else{
						var li_card = ul.find("#licrate"+crate.crateno).find("#lifru"+card.fru);
						var ul_card = ul.find("#licrate"+crate.crateno).find("#ulfru"+card.fru);
					}
					var currentSensors = searchListHW({crateno: crate.crateno, fru: card.fru});
					var indexCURCARD = 0;
					for (var i = 0; i < currentCards.length; i++)
					{
						if (currentCards[i] == card.fru){
							indexCURCARD = i;
							break;
						}
					}
					$(currentSensors).each(function(indexcurrentSensor, currentSensor) {
						var sensorExist = false; 
						for (var i = 0; i < sensors.length; i++)
						{
							if (currentSensor == sensors[i].name)
							{
								sensorExist = true;
								break;
							}
						}
						if (!sensorExist)
						{
							ul.find("#licrate"+crate.crateno).find("#lifru"+card.fru).find("#lisensor"+currentSensor).remove();
							listHW.crate[indexCURCRATE].card[indexCURCARD].sensors.splice(indexcurrentSensor,1);
							if (currentHW.crate == crate.crateno && currentHW.card == card.fru && currentHW.sensor == currentSensor)
							{
								$('#info').empty();
								$('#graph').empty();
								store = {name: "", datasource: [], fru: 0, crateno: 0, sensor: ""};
								currentHW = {crate: crate.crateno, card: card.fru};
							} 
						}
					});			
					$(sensors).each(function(indexSensor, sensor) {
						if (!searchListHW({crateno: crate.crateno, fru: card.fru, sensor: sensor.name})){	
							var li_sensor = $(document.createElement('li')).attr("id","lisensor"+sensor.name).append($(document.createElement('a')).text(sensor.name)).click(function(event) {event.stopPropagation(); showInfo("sensor",{crateno: crate.crateno, fru: card.fru, sensor: sensor.name});}); 
							ul_card.append(li_sensor);
							listHW.crate[indexCURCRATE].card[indexCURCARD].sensors.push(sensor.name);
							currentSensors = searchListHW({crateno: crate.crateno, fru: card.fru});	
							attachCard = true;
						}
					});
					if (attachCard)
					{
						li_card.append(ul_card);
						ul_crate.append(li_card);
					}
				});
				if (attachCrate)
				{
					li_crate.append(ul_crate);
					ul.append(li_crate);
				}
			});
		});
		if (currentHW.sensor)
		{
			updateInfo({crateno: currentHW.crate, fru: currentHW.card, sensor: currentHW.sensor});
			for (var i = 0; i < 3; i++)
			{
			$(function () {
				$("#chartContainer").dxChart({
    					dataSource: store.datasource,	
				});
			});
			}
			if (windowStore){
				setTimeout(function(){
					$('#chartContainer');
					for (var i = 0; i < windowStore.length; i++){
						$(windowStore[i].document.body).html($('#chartContainer').css("visibility", "visible").html());
					}
					$('#chartContainer').css("visibility", "hidden");
				}, 500);
			}
		}
	}

//]]>
