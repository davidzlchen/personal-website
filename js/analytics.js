/* Optional measurement never participates in site behavior or availability. */
(()=>{
  'use strict';
  const ID='G-E4D48915NT', KEY='personal-site.analytics.v1';
  const production=['davidzlchen.com','www.davidzlchen.com'].includes(location.hostname);
  const privateSignal=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
  let choice='', loaded=false;
  try{choice=localStorage.getItem(KEY)||'';}catch{}
  // A bookmarked opt-out link keeps maintainer/test visits out of measurement.
  // Reuse the normal denied preference; the visible Allow button can undo it.
  if(new URLSearchParams(location.search).get('analytics')==='off'){
    choice='denied';
    try{localStorage.setItem(KEY,choice);}catch{}
    clearCookies();
  }
  const allowed=()=>production&&!privateSignal&&choice==='granted';
  function tag(){window.dataLayer=window.dataLayer||[];window.dataLayer.push(arguments);}
  function load(){
    if(!allowed()||loaded)return;
    loaded=true;
    tag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    tag('js',new Date());
    tag('config',ID,{send_page_view:true,allow_google_signals:false,allow_ad_personalization_signals:false,
      page_location:location.origin+location.pathname,page_referrer:cleanReferrer(),page_title:document.title});
    const script=document.createElement('script');script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+ID;
    document.head.append(script);
  }
  function cleanReferrer(){try{const url=new URL(document.referrer);return url.origin;}catch{return '';}}
  function clearCookies(){
    document.cookie.split(';').forEach(item=>{
      const name=item.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))return;
      ['','; domain='+location.hostname,'; domain=.davidzlchen.com'].forEach(domain=>{
        document.cookie=name+'=; Max-Age=0; path=/'+domain+'; SameSite=Lax';
      });
    });
  }
  function render(){
    document.querySelectorAll('[data-analytics-status]').forEach(el=>{
      el.textContent=privateSignal?'Analytics off (browser privacy preference).':choice==='granted'?'Analytics allowed.':choice==='denied'?'Analytics off.':'Analytics off until you allow it.';
    });
    document.querySelectorAll('[data-analytics-choice]').forEach(el=>{
      el.disabled=privateSignal&&el.dataset.analyticsChoice==='granted';
      el.setAttribute('aria-pressed',String(el.dataset.analyticsChoice===choice));
    });
  }
  window.SiteAnalytics={track(name,params={}){
    if(!allowed())return;
    if(!['project_click','field_notes_use'].includes(name))return;
    const safe={};
    if(name==='project_click'&&['justskiing','skiguessr','think-in-odds','pokemon-sleep'].includes(params.project))safe.project=params.project;
    else if(name==='field_notes_use'&&['helper_details','filter','search','sort','snapshot','copy_link','inventory_search'].includes(params.action))safe.action=params.action;
    else return;
    tag('event',name,safe);
  }};
  window.addEventListener('storage',event=>{
    if(event.key!==KEY&&event.key!==null)return;
    choice=event.key===null?'':event.newValue||'';
    window['ga-disable-'+ID]=!allowed();
    if(allowed()){load();if(loaded)tag('consent','update',{analytics_storage:'granted'});}
    else{if(loaded)tag('consent','update',{analytics_storage:'denied'});clearCookies();}
    render();
  });
  function init(){
    document.querySelectorAll('[data-analytics-choice]').forEach(el=>el.addEventListener('click',()=>{
      choice=el.dataset.analyticsChoice;
      try{localStorage.setItem(KEY,choice);}catch{}
      if(choice==='granted')load();
      else{
        if(loaded)tag('consent','update',{analytics_storage:'denied'});
        window['ga-disable-'+ID]=true;
        clearCookies();
      }
      if(choice==='granted'){
        window['ga-disable-'+ID]=false;
        if(loaded)tag('consent','update',{analytics_storage:'granted'});
      }
      render();
    }));
    document.addEventListener('click',event=>{
      const target=event.target.closest?.('a.project, #grid .card, .filter, .snapshot-entry, .detail-share');
      if(!target)return;
      if(target.matches('a.project')){
        const url=new URL(target.href,location.origin);
        const project={'justskiing.info':'justskiing','skiguessr.com':'skiguessr','thinkinodds.com':'think-in-odds'}[url.hostname] || (url.origin===location.origin&&url.pathname==='/pokemon-sleep/'?'pokemon-sleep':'');
        window.SiteAnalytics.track('project_click',{project});
      }else if(/^\/pokemon-sleep\/?$/.test(location.pathname)){
        const action=target.matches('#grid .card')?'helper_details':target.matches('.filter')?'filter':target.matches('.snapshot-entry')?'snapshot':'copy_link';
        window.SiteAnalytics.track('field_notes_use',{action});
      }
    });
    document.addEventListener('change',event=>{
      if(!/^\/pokemon-sleep\/?$/.test(location.pathname))return;
      const action={'search':'search','sort':'sort','shiny':'filter','legendary':'filter','favorite':'filter','inventory-search':'inventory_search','inventory-zero':'filter'}[event.target.id];
      if(action)window.SiteAnalytics.track('field_notes_use',{action});
    });
    render();load();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
