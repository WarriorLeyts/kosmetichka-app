import { StyleSheet, Text, View } from "react-native";
import { useCardScale } from "../cardScale";
import { money } from "../format";
import type { RetailPromotion } from "../retailPricePromotion";
import { FitText } from "./FitText";

export function RetailPriceComparison({ promotion, large=false, dark=false }:{
  promotion:RetailPromotion; large?:boolean; dark?:boolean;
}) {
  const scale=useCardScale();
  const k=large?1:scale;
  const {retail,card,price,retailSaving,cardSaving}=promotion;
  const old=[{label:"Розница",value:retail,saving:retailSaving},{label:"Скидка по карте",value:card,saving:cardSaving}];
  return <View style={{marginTop:large?14:9*k,borderRadius:14*k,paddingVertical:8*k,
    backgroundColor:dark?"#FBF3FA":"#fdf2f8"}}>
    <View style={{flexDirection:"row"}}>
      {old.map((row,i)=><View key={row.label} accessible
        accessibilityLabel={`${row.label}: ${row.value===null?"цена не указана":money(row.value)}`}
        style={{flex:1,minWidth:0,alignItems:"center",paddingHorizontal:6*k,
          ...(i>0?{borderLeftWidth:StyleSheet.hairlineWidth,borderLeftColor:"rgba(139,61,255,0.18)"}:{})}}>
        <Text numberOfLines={2} style={{fontSize:large?13:10,lineHeight:large?17:13,
          minHeight:large?34:26,textAlign:"center",color:"#6B4E8A"}}>{row.label}</Text>
        <FitText style={{fontSize:large?20:13,fontWeight:"600",textAlign:"center",width:"100%",
          color:row.saving>0?"#85808a":"#6B4E8A",textDecorationLine:row.saving>0?"line-through":"none"}}>
          {row.value===null?"—":money(row.value)}
        </FitText>
      </View>)}
    </View>
    <View accessible accessibilityLabel={`Акция розница: ${money(price)}`}
      style={{alignItems:"center",marginTop:8*k,paddingHorizontal:6*k,paddingTop:6*k,
        borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"rgba(199,31,117,0.09)"}}>
      <Text style={{fontSize:large?12:10,fontWeight:"800",color:"#b31668",backgroundColor:"#fce0ef",
        borderRadius:12*k,paddingHorizontal:9*k,paddingVertical:3*k}}>АКЦИЯ РОЗНИЦА</Text>
      <FitText style={{width:"100%",textAlign:"center",fontSize:large?34:scale===1?26:22,
        fontWeight:"800",color:"#c71f75",marginTop:3*k}}>{money(price)}</FitText>
      <View style={{alignSelf:"stretch",backgroundColor:"#e4f6e9",borderRadius:10*k,
        paddingHorizontal:5*k,paddingVertical:3*k,marginTop:4*k}}>
        <FitText minimumFontScale={0.7} style={{textAlign:"center",fontSize:large?12:10,fontWeight:"600",color:"#19793b"}}>
          {retailSaving>0?`Выгода ${money(retailSaving)} от розницы`:`Выгода ${money(cardSaving)} по карте`}
        </FitText>
      </View>
      {cardSaving>0&&card!==retail&&retailSaving>0?<Text numberOfLines={2}
        style={{fontSize:large?12:9,lineHeight:large?16:12,textAlign:"center",color:"#78717c",marginTop:4*k}}>
        На {money(cardSaving)} дешевле цены по карте
      </Text>:null}
    </View>
  </View>;
}
