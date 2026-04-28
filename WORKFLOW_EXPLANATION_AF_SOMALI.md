# Eye Examination Module - Sharaxaad Qoto Dheer (Af Somali)

Dukumentigan waxa uu si gaar ah u sharxayaa Eye Examination module-ka.
Ujeedadu waa in staff-ku fahmaan:
- Column walba waxa uu yahay
- Erayga caafimaad ee uu taagan yahay
- Value-yada uu qaadan karo
- Sida saxda ah ee loo buuxiyo
- Tusaale bukaan dhab ah oo dhamaystiran

Qoraalkan waa qaybta 1aad oo keliya: Eye Examination.

---

## 1) Eye Examination waa maxay?

Eye Examination waa diiwaanka baaritaanka indhaha ee bukaanka maalinta uu yimaado.
Waxa lagu qoro:
- cabashada bukaanka
- aragga (fog iyo dhow)
- refraction (power-ka muraayadda)
- IOP (cadaadiska isha)
- findings gudaha isha
- diagnosis iyo plan
- goorta follow-up-ka xigta

Si fudud: Eye Examination waa halka go'aanka daaweynta laga dhiso.

---

## 2) Terminology muhiim ah (macnaha erayada)

## 2.1 OD, OS, OU
- OD: Oculus Dexter = Right eye (isha midig)
- OS: Oculus Sinister = Left eye (isha bidix)
- OU: Oculus Uterque = Both eyes (labada ishood)

## 2.2 VA (Visual Acuity)
- VA: awoodda arag (sida qofku u arko)
- Unaided: arag muraayad la'aan
- BCVA: Best Corrected Visual Acuity = aragga ugu fiican marka correction la saxo
- Near: arag dhow (akhris)
- Distance: arag fog

## 2.3 Pinhole
- Pinhole test: tijaabo lagu kala saaro haddii aragga liita uu badanaa ka yimid refractive error

## 2.4 Refraction terms
- Sphere: power-ka guud (+ ama -)
- Cylinder: astigmatism-ka
- Axis: jihada astigmatism-ka (0 ilaa 180)
- Add: near addition (badanaa presbyopia)
- PD: Pupillary Distance (masaafada pupils)
- Prism: correction ka caawiya eye alignment

## 2.5 IOP
- IOP: Intraocular Pressure = cadaadiska gudaha isha
- Target IOP: yoolka cadaadis ee la rabo in lagu hayo isha (gaar ahaan glaucoma cases)

## 2.6 Segment terms
- Anterior segment: qaybta hore ee isha (cornea, anterior chamber, iris, lens)
- Fundus / Posterior segment: qaybta dambe (disc, macula, retina, vessels)

---

## 3) Eye Examination Columns - one by one (deep)

Hoos waxaa ku qoran columns-ka muhiimka ah ee module-ka Eye Examination, si practical ah.

## 3.1 Aqoonsi iyo xiriir

| Column | Waxa uu qabto | Nooca value | Example |
|---|---|---|---|
| id | Aqoonsiga exam-ka | UUID auto | 7f2f... |
| branchId | Laanta exam-ku ka dhacay | UUID | branch-main |
| patientId | Bukaanka exam-kan leh | UUID | patient-001 |
| doctorId | Dhakhtarka baaritaanka sameeyay | UUID | doctor-010 |

Micnaha practical:
- Haddii patientId khaldan yahay, exam-ku bukaanka saxda ah lama xirna.
- Haddii doctorId khaldan yahay, medico-legal tracing way khaldamaysaa.

## 3.2 Cabashada iyo taariikhda

| Column | Waxa uu qabto | Values | Example wanaagsan |
|---|---|---|---|
| chiefComplaint | Cabashada ugu weyn (required) | string | Arag fog oo daciif ah 2 bilood |
| historyOfPresentIllness | Taariikh faahfaahsan | string or null | Bilow tartiib ah, madax xanuun fiidkii |

Sida fiican loo qoro:
- duration + symptom + progression
- Example: Arag fog oo sii daciifaya 3 bilood, glare habeenkii

## 3.3 Visual Acuity columns

| Column | Macnaha | Values uu qaato | Example |
|---|---|---|---|
| vaScale | nooca scale | string, default SNELLEN | SNELLEN |
| vaUnaidedOD | fog, OD, correction la'aan | string/null | 6/18 |
| vaUnaidedOS | fog, OS, correction la'aan | string/null | 6/12 |
| vaUnaidedNearOD | dhow, OD, correction la'aan | string/null | N8 |
| vaUnaidedNearOS | dhow, OS, correction la'aan | string/null | N6 |
| vaBcvaOD | fog, OD, best corrected | string/null | 6/6 |
| vaBcvaOS | fog, OS, best corrected | string/null | 6/6 |
| vaBcvaNearOD | dhow, OD, best corrected | string/null | N6 |
| vaBcvaNearOS | dhow, OS, best corrected | string/null | N6 |
| vaPinholeOD | pinhole result OD | string/null | 6/9 |
| vaPinholeOS | pinhole result OS | string/null | 6/9 |

Interpretation kooban:
- Unaided liita + BCVA fiican = refractive error badan suurtagal
- Pinhole ku fiicnaansho = correction-ka lens-ka waa muhiim

## 3.4 Refraction columns

| Column | Macnaha | Values | Example |
|---|---|---|---|
| refractionSphereOD | sphere OD | string/null | -1.25 |
| refractionSphereOS | sphere OS | string/null | -1.00 |
| refractionCylinderOD | cylinder OD | string/null | -0.50 |
| refractionCylinderOS | cylinder OS | string/null | -0.25 |
| refractionAxisOD | axis OD | string/null | 180 |
| refractionAxisOS | axis OS | string/null | 170 |

Sharaxaad:
- Sphere negative: myopia
- Sphere positive: hyperopia
- Cylinder + axis: astigmatism correction

Talo quality:
- Axis mar walba integer 0-180 u qor
- haddii cyl = 0 ama madhan, axis significance way yaraataa

## 3.5 IOP columns

| Column | Macnaha | Values | Example |
|---|---|---|---|
| iopOD | cadaadiska OD | integer/null | 16 |
| iopOS | cadaadiska OS | integer/null | 15 |
| iopMethod | habka cabirka | string/null | Goldmann |
| iopTime | waqtiga cabirka | string/null | 10:30 |
| targetIopOD | yool OD | integer/null | 14 |
| targetIopOS | yool OS | integer/null | 14 |

Clinical note:
- IOP range guud badanaa 10-21 mmHg (context)
- Hal reading kaliya mararka qaar go'aan kama dambays ah ma aha, context + findings ayaa la isku daraa

## 3.6 Findings columns (JSON)

| Column | Macnaha | Nooca value | Example |
|---|---|---|---|
| anteriorSegmentFindings | findings qaybta hore | JSON/null | {"cornea":"clear","lens":"NS2 cataract"} |
| fundusFindings | findings fundus | JSON/null | {"disc":"C/D 0.3","macula":"normal"} |

Sida loo buuxiyo:
- JSON structured ka dhig si search/report u fududaato
- Keys joogto ah isticmaal: cornea, lens, disc, macula, retina

## 3.7 Clinical decision columns

| Column | Macnaha | Values | Example |
|---|---|---|---|
| diagnosis | gunaanad cudur | string/null | Myopic astigmatism |
| plan | qorshe daaweyn | string/null | Samee optical Rx + review 3 months |
| followUpDate | taariikhda dib-u-eegis | ISO date/null | 2026-07-20 |
| nextVisitReason | sababta soo noqoshada | string/null | Re-check VA and IOP |

Haddii diagnosis qoran yahay laakiin plan madhan yahay, workflow-ku ma dhammaystirna.

---

## 4) Values sax ah iyo values khaldan

## 4.1 Tusaale values sax ah
- vaUnaidedOD: 6/18
- vaBcvaOS: 6/6
- refractionSphereOD: -1.25
- refractionCylinderOD: -0.50
- refractionAxisOD: 180
- iopOD: 16
- followUpDate: 2026-06-15

## 4.2 Tusaale values khaldan (la iska ilaaliyo)
- refractionAxisOD: 200 (khalad, waa inuu ahaadaa 0-180)
- iopOD: abc (khalad, waa integer)
- chiefComplaint: madhan (khalad, required)
- followUpDate: 15/06/2026 (format aan ISO ahayn haddii API ISO rabto)

---

## 5) Real Patient Example - Eye Examination only (step by step)

## Bukaan
- Magac: Fadumo Xasan
- Da: 34
- Cabasho: arag fog oo daciif ah + madax xanuun

## Data entry sax ah

1) Aqoonsi
- branchId: laanta hadda uu user-ku joogo
- patientId: Fadumo ID
- doctorId: doctor-ka duty-ga jooga

2) Chief complaint + history
- chiefComplaint: Arag fog oo daciif ah
- historyOfPresentIllness: 4 bilood ayuu socday, fiidkii ayuu ka daraa

3) VA
- vaScale: SNELLEN
- vaUnaidedOD: 6/18
- vaUnaidedOS: 6/12
- vaBcvaOD: 6/6
- vaBcvaOS: 6/6
- vaPinholeOD: 6/9
- vaPinholeOS: 6/9

4) Refraction
- refractionSphereOD: -1.25
- refractionCylinderOD: -0.50
- refractionAxisOD: 180
- refractionSphereOS: -1.00
- refractionCylinderOS: -0.25
- refractionAxisOS: 170

5) IOP
- iopOD: 16
- iopOS: 15
- iopMethod: Goldmann
- iopTime: 10:40

6) Findings
- anteriorSegmentFindings: {"cornea":"clear","lens":"clear"}
- fundusFindings: {"disc":"normal","macula":"normal"}

7) Diagnosis + plan
- diagnosis: Myopic astigmatism, bilateral
- plan: Samee optical prescription + ergonomic advice
- followUpDate: 2026-07-20
- nextVisitReason: Re-check VA kadib muraayad

Natiijo:
- Eye Examination-ku waxa uu noqday complete, readable, oo diyaar u ah in laga sii sameeyo prescription.

---

## 6) Quick checklist Eye Examination (staff)

- [ ] chiefComplaint waa qoran yahay
- [ ] VA unaided + BCVA waa la buuxiyay (OD/OS)
- [ ] Refraction sphere/cylinder/axis sax ayay u qoran yihiin
- [ ] IOP values numbers sax ah ayay yihiin
- [ ] Findings (anterior + fundus) waa la qoray
- [ ] diagnosis iyo plan waa jira
- [ ] followUpDate waa la dhigay haddii loo baahdo

---

## 7) Qodob muhiim ah oo maamulka quality-ga

1. Hal standard u isticmaal OD/OS terms.
2. Axis range had iyo jeer 0-180.
3. IOP mar walba integer ama null, text ha gelin.
4. Findings-ka JSON structured ka dhig si report-ku u shaqeeyo.
5. Diagnosis iyo plan ha kala go'in: mid walba waa inuu leeyahay macno daaweyn.

---

Qaybta xigta haddii aad rabto waxaan sidan oo kale u sii kala qaadi doonaa: Prescription module (Optical + Medicine), sidoo kale one by one.