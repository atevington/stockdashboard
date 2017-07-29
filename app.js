;!(function(ng, undefined) {
	var app = ng.module("stockDashboard", []);
	
	app.constant("$stockDataUrl", "https://api.iextrading.com/1.0/stock/");
	
	app.service("$stockService", function($stockDataUrl, $http) {
		var _self = this;
		
		var apiRequest = function(symbol, endpoint, checkProp, callback) {
			$http({method: "GET", url: $stockDataUrl + encodeURIComponent(symbol) + "/" + endpoint}).then(function(res) {
				if (res && res.data && res.data[checkProp]) {
					callback(res.data);
				}
			});
		};
		
		_self.getCompany = function(symbol, callback) {
			apiRequest(symbol, "company", "companyName", callback);
		};
		
		_self.getQuote = function(symbol, callback) {
			apiRequest(symbol, "quote", "primaryExchange", callback);
		};
	});
	
	app.factory("$localStorageProvider", function() {
		return function(keys) {
			var _self = this;
			
			keys.map(function(key) {
				Object.defineProperty(_self, key, {
					get: function() {
						return JSON.parse(localStorage.getItem(key));
					},
					set: function(val) {
						return localStorage.setItem(key, JSON.stringify(val));
					}
				});
			});
		};
	});
	
	app.controller("mainController", function($scope, $stockService, $localStorageProvider) {
		var localStorageProvider = new $localStorageProvider(["stockList"]);

		var loadSymbolsFromStorage = function() {
			var storedSymbols = localStorageProvider.stockList || [];
			
			storedSymbols.map(function(symbol) {
				addSymbol(symbol);
			});
		};
		
		var updateSymbols = function() {
			var symbols = ng.extend([], $scope.rootSymbols);
			localStorageProvider.stockList = symbols;
			$scope.$broadcast("symbols", symbols);
		};
		
		var addSymbol = function(symbol) {
			var symbolIndex = $scope.rootSymbols.indexOf(symbol);
			
			if (symbolIndex === -1) {
				$scope.rootSymbols.push(symbol);
				updateCompany(symbol);
				updateQuote(symbol);
			}
		};
		
		var updateCompany = function(symbol) {
			$stockService.getCompany(symbol, function(company) {
				$scope.$broadcast("company", company);
			});
		};
		
		var updateQuote = function(symbol) { 
			$stockService.getQuote(symbol, function(quote) {
				$scope.$broadcast("quote", quote);
			});
		};
		
		var removeSymbol = function(symbol) {
			var symbolIndex = $scope.rootSymbols.indexOf(symbol);
			
			if (symbolIndex !== -1) {
				$scope.rootSymbols.splice(symbolIndex, 1);
			}
		};
		
		var refreshData = function(refreshCompanies, refreshQuotes) {
			$scope.rootSymbols.map(function(symbol) {
				
				if (refreshCompanies) {
					updateCompany(symbol);
				}
				
				if (refreshQuotes) {
					updateQuote(symbol);
				}
			});
		};
		
		$scope.rootSymbols = [];
		
		$scope.$watch("rootSymbols.length", function() {
			updateSymbols();
		});
		
		$scope.$on("addSymbol", function(evt, symbol) {
			addSymbol(symbol);
		});
		
		$scope.$on("removeSymbol", function(evt, symbol) {
			removeSymbol(symbol);
		});
		
		$scope.$on("refreshCompanies", function() {
			refreshData(true, false);
		});
		
		$scope.$on("refreshQuotes", function() {
			refreshData(false, true);
		});

		loadSymbolsFromStorage();
	});
	
	app.controller("addSymbolController", function($scope) {
		$scope.symbol = "";
		
		$scope.addSymbol = function() {
			var symbolToAdd = ($scope.symbol || "").trim().toUpperCase();

			if (symbolToAdd) {
				$scope.$emit("addSymbol", symbolToAdd);
				$scope.symbol = "";
			}
		};
		
		$scope.detectEnter = function(evt) {
			if (evt.which === 13) {
				$scope.addSymbol();
			}
		};
	});
	
	app.controller("listController", function($scope, $timeout) {
		var companies = {};
		var quotes = {};
		
		$scope.symbols = [];
		$scope.refreshDisabled = false;
		
		$scope.$on("symbols", function(evt, rootSymbols) {
			$scope.symbols = rootSymbols;
			$scope.refreshDisabled = false;
		});
		
		$scope.$on("company", function(evt, company) {
			companies[company.symbol] = company;
		});
		
		$scope.$on("quote", function(evt, quote) {
			quotes[quote.symbol] = quote;
		});
		
		$scope.companyName = function(symbol) {
			return companies[symbol] ? companies[symbol].companyName : "-";
		};
		
		$scope.lastPrice = function(symbol) {
			return quotes[symbol] ? (quotes[symbol].iexRealtimePrice || quotes[symbol].latestPrice) : 0;
		};
		
		$scope.isRealTimePrice = function(symbol) {
			return quotes[symbol] && quotes[symbol].iexRealtimePrice ? true : false;
		};
		
		$scope.previousClose = function(symbol) {
			return quotes[symbol] ? quotes[symbol].previousClose : 0;
		};
		
		$scope.percentChange = function(symbol) {
			var lastPrice = $scope.lastPrice(symbol);
			var previousClose = $scope.previousClose(symbol);
			
			if (previousClose === 0) {
				return 0;
			}
			
			return (((lastPrice - previousClose) / previousClose) * 100);
		};
		
		$scope.removeSymbol = function(symbol) {
			var symbolToRemove = (symbol || "").trim().toUpperCase();
			
			if (symbolToRemove) {
				if (companies[symbolToRemove]) {
					delete companies[symbolToRemove];
				}
				
				if (quotes[symbolToRemove]) {
					delete quotes[symbolToRemove];
				}
				
				$scope.$emit("removeSymbol", symbolToRemove);
			}
		};

		$scope.refresh = function() {
			var disableSeconds = 5;
			
			$scope.refreshDisabled = true;
			$scope.$emit("refreshQuotes");
			
			$timeout(function() {
				$scope.refreshDisabled = false;
			}, disableSeconds * 1000);
		};
	});
	
	document.getElementById("symbolInput").focus();
}).apply(window, [angular]);