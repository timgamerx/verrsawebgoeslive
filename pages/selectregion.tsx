// @ts-nocheck
import { useRouter } from 'next/router';
import { FlatList } from '../lib/reactNativeShim';
import React, { useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoAdd, IoArrowBack, IoBookmark, IoChatbubble, IoCheckmark, IoChevronBack, IoChevronDown, IoChevronForward, IoChevronUp, IoClose, IoCopy, IoCreate, IoEye, IoEyeOff, IoHeart, IoHeartOutline, IoHome, IoMenu, IoMic, IoNewspaper, IoNotifications, IoPeople, IoSearch, IoSettings, IoShare, IoStar, IoTrash, IoVideocam } from 'react-icons/io5';
import { saveOnboardingData } from '../lib/onboardingManager';

const countries = [
  {
    code: "AF",
    name: "Afghanistan",
    flag: "https://flagcdn.com/w40/af.png",
  },
  {
    code: "AL",
    name: "Albania",
    flag: "https://flagcdn.com/w40/al.png",
  },
  {
    code: "DZ",
    name: "Algeria",
    flag: "https://flagcdn.com/w40/dz.png",
  },
  {
    code: "AO",
    name: "Angola",
    flag: "https://flagcdn.com/w40/ao.png",
  },
  {
    code: "AR",
    name: "Argentina",
    flag: "https://flagcdn.com/w40/ar.png",
  },
  {
    code: "AM",
    name: "Armenia",
    flag: "https://flagcdn.com/w40/am.png",
  },
  {
    code: "AU",
    name: "Australia",
    flag: "https://flagcdn.com/w40/au.png",
  },
  {
    code: "AT",
    name: "Austria",
    flag: "https://flagcdn.com/w40/at.png",
  },
  {
    code: "AZ",
    name: "Azerbaijan",
    flag: "https://flagcdn.com/w40/az.png",
  },
  {
    code: "BS",
    name: "Bahamas",
    flag: "https://flagcdn.com/w40/bs.png",
  },
  {
    code: "BD",
    name: "Bangladesh",
    flag: "https://flagcdn.com/w40/bd.png",
  },
  {
    code: "BY",
    name: "Belarus",
    flag: "https://flagcdn.com/w40/by.png",
  },
  {
    code: "BE",
    name: "Belgium",
    flag: "https://flagcdn.com/w40/be.png",
  },
  {
    code: "BJ",
    name: "Benin",
    flag: "https://flagcdn.com/w40/bj.png",
  },
  {
    code: "BO",
    name: "Bolivia",
    flag: "https://flagcdn.com/w40/bo.png",
  },
  {
    code: "BR",
    name: "Brazil",
    flag: "https://flagcdn.com/w40/br.png",
  },
  {
    code: "BG",
    name: "Bulgaria",
    flag: "https://flagcdn.com/w40/bg.png",
  },
  {
    code: "BF",
    name: "Burkina Faso",
    flag: "https://flagcdn.com/w40/bf.png",
  },
  {
    code: "BI",
    name: "Burundi",
    flag: "https://flagcdn.com/w40/bi.png",
  },
  {
    code: "KH",
    name: "Cambodia",
    flag: "https://flagcdn.com/w40/kh.png",
  },
  {
    code: "CM",
    name: "Cameroon",
    flag: "https://flagcdn.com/w40/cm.png",
  },
  {
    code: "CA",
    name: "Canada",
    flag: "https://flagcdn.com/w40/ca.png",
  },
  {
    code: "CF",
    name: "Central African Republic",
    flag: "https://flagcdn.com/w40/cf.png",
  },
  {
    code: "TD",
    name: "Chad",
    flag: "https://flagcdn.com/w40/td.png",
  },
  {
    code: "CL",
    name: "Chile",
    flag: "https://flagcdn.com/w40/cl.png",
  },
  {
    code: "CN",
    name: "China",
    flag: "https://flagcdn.com/w40/cn.png",
  },
  {
    code: "CO",
    name: "Colombia",
    flag: "https://flagcdn.com/w40/co.png",
  },
  {
    code: "CG",
    name: "Congo - Brazzaville",
    flag: "https://flagcdn.com/w40/cg.png",
  },
  {
    code: "CD",
    name: "Congo - Kinshasa",
    flag: "https://flagcdn.com/w40/cd.png",
  },
  {
    code: "CR",
    name: "Costa Rica",
    flag: "https://flagcdn.com/w40/cr.png",
  },
  {
    code: "CI",
    name: "C\u00f4te d\u2019Ivoire",
    flag: "https://flagcdn.com/w40/ci.png",
  },
  {
    code: "HR",
    name: "Croatia",
    flag: "https://flagcdn.com/w40/hr.png",
  },
  {
    code: "CU",
    name: "Cuba",
    flag: "https://flagcdn.com/w40/cu.png",
  },
  {
    code: "CY",
    name: "Cyprus",
    flag: "https://flagcdn.com/w40/cy.png",
  },
  {
    code: "CZ",
    name: "Czechia",
    flag: "https://flagcdn.com/w40/cz.png",
  },
  {
    code: "DK",
    name: "Denmark",
    flag: "https://flagcdn.com/w40/dk.png",
  },
  {
    code: "DJ",
    name: "Djibouti",
    flag: "https://flagcdn.com/w40/dj.png",
  },
  {
    code: "DO",
    name: "Dominican Republic",
    flag: "https://flagcdn.com/w40/do.png",
  },
  {
    code: "EC",
    name: "Ecuador",
    flag: "https://flagcdn.com/w40/ec.png",
  },
  {
    code: "EG",
    name: "Egypt",
    flag: "https://flagcdn.com/w40/eg.png",
  },
  {
    code: "SV",
    name: "El Salvador",
    flag: "https://flagcdn.com/w40/sv.png",
  },
  {
    code: "GQ",
    name: "Equatorial Guinea",
    flag: "https://flagcdn.com/w40/gq.png",
  },
  {
    code: "ER",
    name: "Eritrea",
    flag: "https://flagcdn.com/w40/er.png",
  },
  {
    code: "EE",
    name: "Estonia",
    flag: "https://flagcdn.com/w40/ee.png",
  },
  {
    code: "ET",
    name: "Ethiopia",
    flag: "https://flagcdn.com/w40/et.png",
  },
  {
    code: "FI",
    name: "Finland",
    flag: "https://flagcdn.com/w40/fi.png",
  },
  {
    code: "FR",
    name: "France",
    flag: "https://flagcdn.com/w40/fr.png",
  },
  {
    code: "GA",
    name: "Gabon",
    flag: "https://flagcdn.com/w40/ga.png",
  },
  {
    code: "GM",
    name: "Gambia",
    flag: "https://flagcdn.com/w40/gm.png",
  },
  {
    code: "GE",
    name: "Georgia",
    flag: "https://flagcdn.com/w40/ge.png",
  },
  {
    code: "DE",
    name: "Germany",
    flag: "https://flagcdn.com/w40/de.png",
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "https://flagcdn.com/w40/gh.png",
  },
  {
    code: "GR",
    name: "Greece",
    flag: "https://flagcdn.com/w40/gr.png",
  },
  {
    code: "GT",
    name: "Guatemala",
    flag: "https://flagcdn.com/w40/gt.png",
  },
  {
    code: "GN",
    name: "Guinea",
    flag: "https://flagcdn.com/w40/gn.png",
  },
  {
    code: "GW",
    name: "Guinea-Bissau",
    flag: "https://flagcdn.com/w40/gw.png",
  },
  {
    code: "HT",
    name: "Haiti",
    flag: "https://flagcdn.com/w40/ht.png",
  },
  {
    code: "HN",
    name: "Honduras",
    flag: "https://flagcdn.com/w40/hn.png",
  },
  {
    code: "HU",
    name: "Hungary",
    flag: "https://flagcdn.com/w40/hu.png",
  },
  {
    code: "IN",
    name: "India",
    flag: "https://flagcdn.com/w40/in.png",
  },
  {
    code: "ID",
    name: "Indonesia",
    flag: "https://flagcdn.com/w40/id.png",
  },
  {
    code: "IR",
    name: "Iran",
    flag: "https://flagcdn.com/w40/ir.png",
  },
  {
    code: "IQ",
    name: "Iraq",
    flag: "https://flagcdn.com/w40/iq.png",
  },
  {
    code: "IE",
    name: "Ireland",
    flag: "https://flagcdn.com/w40/ie.png",
  },
  {
    code: "IL",
    name: "Israel",
    flag: "https://flagcdn.com/w40/il.png",
  },
  {
    code: "IT",
    name: "Italy",
    flag: "https://flagcdn.com/w40/it.png",
  },
  {
    code: "JM",
    name: "Jamaica",
    flag: "https://flagcdn.com/w40/jm.png",
  },
  {
    code: "JP",
    name: "Japan",
    flag: "https://flagcdn.com/w40/jp.png",
  },
  {
    code: "JO",
    name: "Jordan",
    flag: "https://flagcdn.com/w40/jo.png",
  },
  {
    code: "KZ",
    name: "Kazakhstan",
    flag: "https://flagcdn.com/w40/kz.png",
  },
  {
    code: "KE",
    name: "Kenya",
    flag: "https://flagcdn.com/w40/ke.png",
  },
  {
    code: "KP",
    name: "North Korea",
    flag: "https://flagcdn.com/w40/kp.png",
  },
  {
    code: "KR",
    name: "South Korea",
    flag: "https://flagcdn.com/w40/kr.png",
  },
  {
    code: "KW",
    name: "Kuwait",
    flag: "https://flagcdn.com/w40/kw.png",
  },
  {
    code: "KG",
    name: "Kyrgyzstan",
    flag: "https://flagcdn.com/w40/kg.png",
  },
  {
    code: "LA",
    name: "Laos",
    flag: "https://flagcdn.com/w40/la.png",
  },
  {
    code: "LV",
    name: "Latvia",
    flag: "https://flagcdn.com/w40/lv.png",
  },
  {
    code: "LB",
    name: "Lebanon",
    flag: "https://flagcdn.com/w40/lb.png",
  },
  {
    code: "LS",
    name: "Lesotho",
    flag: "https://flagcdn.com/w40/ls.png",
  },
  {
    code: "LR",
    name: "Liberia",
    flag: "https://flagcdn.com/w40/lr.png",
  },
  {
    code: "LY",
    name: "Libya",
    flag: "https://flagcdn.com/w40/ly.png",
  },
  {
    code: "LT",
    name: "Lithuania",
    flag: "https://flagcdn.com/w40/lt.png",
  },
  {
    code: "LU",
    name: "Luxembourg",
    flag: "https://flagcdn.com/w40/lu.png",
  },
  {
    code: "MG",
    name: "Madagascar",
    flag: "https://flagcdn.com/w40/mg.png",
  },
  {
    code: "MW",
    name: "Malawi",
    flag: "https://flagcdn.com/w40/mw.png",
  },
  {
    code: "MY",
    name: "Malaysia",
    flag: "https://flagcdn.com/w40/my.png",
  },
  {
    code: "ML",
    name: "Mali",
    flag: "https://flagcdn.com/w40/ml.png",
  },
  {
    code: "MR",
    name: "Mauritania",
    flag: "https://flagcdn.com/w40/mr.png",
  },
  {
    code: "MX",
    name: "Mexico",
    flag: "https://flagcdn.com/w40/mx.png",
  },
  {
    code: "MA",
    name: "Morocco",
    flag: "https://flagcdn.com/w40/ma.png",
  },
  {
    code: "MZ",
    name: "Mozambique",
    flag: "https://flagcdn.com/w40/mz.png",
  },
  {
    code: "NA",
    name: "Namibia",
    flag: "https://flagcdn.com/w40/na.png",
  },
  {
    code: "NP",
    name: "Nepal",
    flag: "https://flagcdn.com/w40/np.png",
  },
  {
    code: "NL",
    name: "Netherlands",
    flag: "https://flagcdn.com/w40/nl.png",
  },
  {
    code: "NZ",
    name: "New Zealand",
    flag: "https://flagcdn.com/w40/nz.png",
  },
  {
    code: "NI",
    name: "Nicaragua",
    flag: "https://flagcdn.com/w40/ni.png",
  },
  {
    code: "NE",
    name: "Niger",
    flag: "https://flagcdn.com/w40/ne.png",
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "https://flagcdn.com/w40/ng.png",
  },
  {
    code: "NO",
    name: "Norway",
    flag: "https://flagcdn.com/w40/no.png",
  },
  {
    code: "OM",
    name: "Oman",
    flag: "https://flagcdn.com/w40/om.png",
  },
  {
    code: "PK",
    name: "Pakistan",
    flag: "https://flagcdn.com/w40/pk.png",
  },
  {
    code: "PA",
    name: "Panama",
    flag: "https://flagcdn.com/w40/pa.png",
  },
  {
    code: "PG",
    name: "Papua New Guinea",
    flag: "https://flagcdn.com/w40/pg.png",
  },
  {
    code: "PY",
    name: "Paraguay",
    flag: "https://flagcdn.com/w40/py.png",
  },
  {
    code: "PE",
    name: "Peru",
    flag: "https://flagcdn.com/w40/pe.png",
  },
  {
    code: "PH",
    name: "Philippines",
    flag: "https://flagcdn.com/w40/ph.png",
  },
  {
    code: "PL",
    name: "Poland",
    flag: "https://flagcdn.com/w40/pl.png",
  },
  {
    code: "PT",
    name: "Portugal",
    flag: "https://flagcdn.com/w40/pt.png",
  },
  {
    code: "QA",
    name: "Qatar",
    flag: "https://flagcdn.com/w40/qa.png",
  },
  {
    code: "RO",
    name: "Romania",
    flag: "https://flagcdn.com/w40/ro.png",
  },
  {
    code: "RU",
    name: "Russia",
    flag: "https://flagcdn.com/w40/ru.png",
  },
  {
    code: "RW",
    name: "Rwanda",
    flag: "https://flagcdn.com/w40/rw.png",
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    flag: "https://flagcdn.com/w40/sa.png",
  },
  {
    code: "SN",
    name: "Senegal",
    flag: "https://flagcdn.com/w40/sn.png",
  },
  {
    code: "RS",
    name: "Serbia",
    flag: "https://flagcdn.com/w40/rs.png",
  },
  {
    code: "SL",
    name: "Sierra Leone",
    flag: "https://flagcdn.com/w40/sl.png",
  },
  {
    code: "SG",
    name: "Singapore",
    flag: "https://flagcdn.com/w40/sg.png",
  },
  {
    code: "SK",
    name: "Slovakia",
    flag: "https://flagcdn.com/w40/sk.png",
  },
  {
    code: "SO",
    name: "Somalia",
    flag: "https://flagcdn.com/w40/so.png",
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "https://flagcdn.com/w40/za.png",
  },
  {
    code: "SS",
    name: "South Sudan",
    flag: "https://flagcdn.com/w40/ss.png",
  },
  {
    code: "ES",
    name: "Spain",
    flag: "https://flagcdn.com/w40/es.png",
  },
  {
    code: "LK",
    name: "Sri Lanka",
    flag: "https://flagcdn.com/w40/lk.png",
  },
  {
    code: "SD",
    name: "Sudan",
    flag: "https://flagcdn.com/w40/sd.png",
  },
  {
    code: "SE",
    name: "Sweden",
    flag: "https://flagcdn.com/w40/se.png",
  },
  {
    code: "CH",
    name: "Switzerland",
    flag: "https://flagcdn.com/w40/ch.png",
  },
  {
    code: "SY",
    name: "Syria",
    flag: "https://flagcdn.com/w40/sy.png",
  },
  {
    code: "TW",
    name: "Taiwan",
    flag: "https://flagcdn.com/w40/tw.png",
  },
  {
    code: "TZ",
    name: "Tanzania",
    flag: "https://flagcdn.com/w40/tz.png",
  },
  {
    code: "TH",
    name: "Thailand",
    flag: "https://flagcdn.com/w40/th.png",
  },
  {
    code: "TG",
    name: "Togo",
    flag: "https://flagcdn.com/w40/tg.png",
  },
  {
    code: "TN",
    name: "Tunisia",
    flag: "https://flagcdn.com/w40/tn.png",
  },
  {
    code: "TR",
    name: "Turkey",
    flag: "https://flagcdn.com/w40/tr.png",
  },
  {
    code: "UG",
    name: "Uganda",
    flag: "https://flagcdn.com/w40/ug.png",
  },
  {
    code: "UA",
    name: "Ukraine",
    flag: "https://flagcdn.com/w40/ua.png",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    flag: "https://flagcdn.com/w40/ae.png",
  },
  {
    code: "GB",
    name: "United Kingdom",
    flag: "https://flagcdn.com/w40/gb.png",
  },
  {
    code: "US",
    name: "United States",
    flag: "https://flagcdn.com/w40/us.png",
  },
  {
    code: "UY",
    name: "Uruguay",
    flag: "https://flagcdn.com/w40/uy.png",
  },
  {
    code: "UZ",
    name: "Uzbekistan",
    flag: "https://flagcdn.com/w40/uz.png",
  },
  {
    code: "VE",
    name: "Venezuela",
    flag: "https://flagcdn.com/w40/ve.png",
  },
  {
    code: "VN",
    name: "Vietnam",
    flag: "https://flagcdn.com/w40/vn.png",
  },
  {
    code: "YE",
    name: "Yemen",
    flag: "https://flagcdn.com/w40/ye.png",
  },
  {
    code: "ZM",
    name: "Zambia",
    flag: "https://flagcdn.com/w40/zm.png",
  },
  {
    code: "ZW",
    name: "Zimbabwe",
    flag: "https://flagcdn.com/w40/zw.png",
  },
];

const SelectRegion = ({ navigation }) => {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<{
    code: string;
    name: string;
    flag: string;
  } | null>(null);

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderCountry = ({ item }) => {
    const isSelected = selectedCountry?.code === item.code;

    return (
      <button
        style={{...(styles.countryItem || {}), ...(isSelected ? styles.selectedCountryItem : {})}}
        onClick={() => setSelectedCountry(item)}
      >
        <img src={item.flag } style={styles.flag} />
        <span style={styles.code}>{item.code}</span>
        <span style={styles.name}>{item.name}</span>
        {isSelected && (
          <IoCheckmark />
        )}
      </button>
    );
  };

  const handleContinue = async () => {
    if (selectedCountry) {
      // Save selected country to AsyncStorage
      await saveOnboardingData({
        countryName: selectedCountry.name,
        countryCode: selectedCountry.code,
      });
      router.push("/auth");
    }
  };

  return (
    <div style={styles.container}>
      <span style={styles.title}>Please select region!</span>
      <span style={styles.subtitle}>
        Kindly select your country to allow us tailor the best experience for
        you.
      </span>

      <input
        style={styles.input}
        placeholder="Enter country name to filter"
        placeholderTextColor="#999"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />

      <FlatList
        data={filteredCountries}
        renderItem={renderCountry}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <button
        style={styles.continueButton}
        onClick={handleContinue}
        disabled={!selectedCountry}
      >
        <span style={styles.continueText}>Continue</span>
      </button>
    </div>
  );
};

export default SelectRegion;

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg, // space left and right
    paddingTop: 50,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: fontSize.xl3,
    fontWeight: "500",
    marginBottom: spacing.px,
    marginTop: spacing.md,
    fontFamily: "InstrumentSans-Bold",
  },
  subtitle: {
    fontSize: fontSize.md2,
    color: "#555",
    marginBottom: spacing.lg,
  },
  input: {
    borderColor: "#23C9FF",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: fontSize.base,
    marginBottom: spacing.lg,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: radius.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    marginBottom: spacing.md,
  },
  selectedCountryItem: {
    backgroundColor: "#E6F9FF",
  },
  flag: {
    width: 28,
    height: 20,
    marginRight: spacing.md,
    borderRadius: radius.xs,
  },
  code: {
    fontWeight: "600",
    width: 40,
  },
  name: {
    fontSize: fontSize.base,
    flex: 1,
  },
  checkIcon: {
    marginLeft: spacing.md,
  },
  continueButton: {
    backgroundColor: "#23C9FF",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  continueText: {
    color: "#fff",
    fontWeight: "400",
    fontSize: fontSize.xl,
  },
};
