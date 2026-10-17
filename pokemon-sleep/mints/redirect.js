const destination=new URL('/pokemon-sleep/ingredients/',location.origin);
for(const key of ['snapshot','ingredient','aaa','final-only','analytics','island'])if(new URLSearchParams(location.search).has(key))destination.searchParams.set(key,new URLSearchParams(location.search).get(key));
destination.hash='mint-analysis';location.replace(destination.href);
