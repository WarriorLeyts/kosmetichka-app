import { useSyncExternalStore } from "react";
import { getPricingCampaign, campaignRevision, subscribeCampaign } from "@/campaignRuntime";
import type { Campaign } from "@/campaign";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { pricingCampaignActive } from "@/pricing";
import { useCatalog } from "@/store/catalog";
import { FitText } from "@/components/FitText";
import { money } from "@/format";

/** Responsive version of the chosen pink/violet promotion ticket. */
export function CampaignBanner({desktop=false}:{desktop?:boolean}){
  useSyncExternalStore(subscribeCampaign, campaignRevision, campaignRevision);
  const campaign = getPricingCampaign();
  const {width}=useWindowDimensions();
  if(!pricingCampaignActive())return null;
  const wide=desktop&&width>=1000;
  const open=()=>{
    useCatalog.getState().reset();
    useCatalog.getState().set({quick:campaign.usePromoPrices?["promo"]:[]});
    router.navigate(campaign.usePromoPrices?"/catalog?quick=promo":"/catalog");
  };
  return <LinearGradient colors={["#fff7fd","#fbe4fa","#e9a5f2","#8b3dff"]}
    locations={[0,0.46,0.76,1]} start={{x:0,y:0}} end={{x:1,y:1}}
    style={{borderRadius:26,overflow:"hidden",padding:wide?30:20,
      flexDirection:wide?"row":"column",gap:wide?24:14}}>
    <Text pointerEvents="none" style={{position:"absolute",right:-10,top:-35,fontSize:180,
      fontWeight:"800",color:"rgba(255,255,255,0.20)",transform:[{rotate:"-12deg"}]}}>%</Text>
    <View style={{flex:wide?1:undefined,minWidth:0}}>
      <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,alignItems:"center",marginBottom:12}}>
        <Text style={{color:"#c71f75",fontSize:13,fontWeight:"800"}}>КОСМЕТИЧКА</Text>
        <Text style={{color:"#67308c",backgroundColor:"#efd8fa",borderRadius:16,
          paddingHorizontal:10,paddingVertical:5,fontSize:11,fontWeight:"700"}}>{[campaign.startsAt, campaign.endsAt && new Date(Date.parse(campaign.endsAt)-1).toISOString()].filter(Boolean).map(d => new Date(d!).toLocaleDateString("ru-RU", {timeZone:"Europe/Moscow"})).join(" — ")}</Text>
      </View>
      <Text accessibilityRole="header" style={{fontSize:wide?34:28,lineHeight:wide?39:32,
        fontWeight:"900",color:"#62033f"}}>{campaign.name}</Text>
      <View style={{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:7,
        backgroundColor:"#fff8ff",borderRadius:14,paddingHorizontal:12,paddingVertical:8,marginTop:12,maxWidth:"100%"}}>
        <Ionicons name="sparkles-outline" size={18} color="#b51070" />
        <Text style={{fontSize:wide?17:15,fontWeight:"800",color:"#b51070",flexShrink:1}}>Теперь и парфюмерия</Text>
      </View>
      <Text style={{fontSize:wide?16:13,color:"#70358b",marginTop:8}}>Косметика и парфюмерия по акционным ценам</Text>
      {!wide?<Ticket campaign={campaign} />:null}
      <Text style={{fontSize:wide?18:15,fontWeight:"800",color:"#c71f75",marginTop:16,marginBottom:9}}>
        {campaign.discountSteps.length ? `Дополнительная скидка до ${Math.max(...campaign.discountSteps.map(s => s.percent))}%` : "Акционные условия"}
      </Text>
      <View style={{flexDirection:"row",flexWrap:"wrap",gap:6}}>
        {campaign.discountSteps.map(({from,percent})=>
          <View key={from} style={{flex:1,minWidth:0,borderRadius:12,backgroundColor:"rgba(255,255,255,0.94)",
            paddingHorizontal:5,paddingVertical:10}}>
            <FitText style={{fontSize:wide?12:10,textAlign:"center",color:"#62033f",fontWeight:"700"}}>от {money(from)}</FitText>
            <Text style={{fontSize:wide?24:19,textAlign:"center",fontWeight:"900",color:"#d31278"}}>−{percent}%</Text>
          </View>)}
      </View>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Смотреть акционные товары"
        style={({pressed})=>({alignSelf:wide?"flex-start":"stretch",marginTop:16,opacity:pressed?0.85:1})}>
        <LinearGradient colors={["#ee2c93","#d40070"]} start={{x:0,y:0}} end={{x:1,y:0}}
          style={{paddingHorizontal:24,height:46,borderRadius:25,flexDirection:"row",
            gap:10,alignItems:"center",justifyContent:"center"}}>
          <Text style={{fontSize:15,fontWeight:"800",color:"#fff"}}>Смотреть акционные товары</Text>
          <Ionicons name="arrow-forward" color="#fff" size={19}/>
        </LinearGradient>
      </Pressable>
      <Text style={{fontSize:10,lineHeight:14,color:"#70416f",marginTop:10}}>
        На шок-цены дополнительная скидка не действует. Применяется одна максимальная скидка по сумме заказа.
      </Text>
    </View>
    {wide?<View style={{flex:0.7,minWidth:230,justifyContent:"center"}}><Ticket wide campaign={campaign} /></View>:null}
  </LinearGradient>;
}

function Ticket({wide=false,campaign}:{wide?:boolean;campaign:Campaign}){
  return <View style={{backgroundColor:"#fff8ff",borderRadius:24,paddingHorizontal:20,
    paddingVertical:wide?32:12,marginTop:wide?0:14,marginHorizontal:wide?4:10,
    transform:[{rotate:wide?"-6deg":"-3deg"}],boxShadow:"0 10px 28px rgba(112,18,151,0.16)"}}>
    <Text style={{fontSize:wide?15:12,textAlign:"center",fontWeight:"700",color:"#6a347d"}}>КРУПНЫЙ ОПТ ОТ</Text>
    {campaign.bigWholesaleMin < 50000 && <Text style={{fontSize:wide?19:14,textAlign:"center",color:"#875693",marginTop:5}}>
      вместо <Text style={{textDecorationLine:"line-through"}}>50 000 ₽</Text>
    </Text>}
    <FitText style={{fontSize:wide?60:38,textAlign:"center",fontWeight:"900",color:"#e00076",marginTop:3}}>{money(campaign.bigWholesaleMin)}</FitText>
  </View>;
}
