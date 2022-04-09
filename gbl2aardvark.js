/* global testRecords */
'use strict'

const inputs = []

document.addEventListener('DOMContentLoaded', init)

function init () {
  document.getElementById('inputFiles').addEventListener('change', inputFilesChanged)
  document.getElementById('input').addEventListener('dragenter', dragEnter)
  document.getElementById('input').addEventListener('dragleave', dragLeave)
  document.getElementById('input').addEventListener('drop', dropFiles)
  document.getElementById('input').addEventListener('change', processInput)
  document.getElementById('input').addEventListener('keyup', processInput)
  document.getElementById('download').addEventListener('click', downloadFile)
  document.getElementById('test').addEventListener('click', loadTestRecords)
}

function loadTestRecords () {
  let input = JSON.stringify(testRecords, null, 2)

  // add blank lines between records, for readability
  input = input.replace(/},\n\s\s{/g, '},\n\n\n\n  {')

  document.getElementById('input').value = input
  processInput()
}

function dragEnter (e) {
  e.preventDefault()
  e.target.classList.add('dragging')
}

function dragLeave (e) {
  e.preventDefault()
  e.target.classList.remove('dragging')
}

function dropFiles (e) {
  e.preventDefault()
  e.target.classList.remove('dragging')
  const files = e.dataTransfer.files
  processFiles(files)
}

function inputFilesChanged (e) {
  const files = this.files
  processFiles(files)
}

function processFiles (files) {
  // Push the contents of each file to global inputs []
  document.getElementById('output').placeholder = 'processing...'
  const r = new window.FileReader()
  function readFile (i) {
    if (i >= files.length) {
      gotInputs()
      return
    }
    const file = files[i]
    r.onload = function (e) {
      let j
      try {
        // parse as json
        j = JSON.parse(e.target.result)
      } catch {
        window.alert('Error parsing JSON from file: ' + file.name)
        return
      }
      // if a full solr response, only use the response/docs
      if (j.response && j.response.docs) {
        j = j.response.docs
      }

      // pretty-print
      const pp = JSON.stringify(j, null, 2)
      inputs.push(pp)
      readFile(i + 1)
    }
    r.readAsText(file)
  }
  readFile(0)
}

function gotInputs () {
  // merge the inputs into an array
  let input = inputs
  if (input.length > 1) {
    input = '[\n' + input.join(',\n') + '\n]'
  }
  document.getElementById('input').value = input
  processInput()

  // enable the download button
  document.getElementById('download').disabled = false
}

function downloadFile () {
  // download the output as a .json file
  const output = document.getElementById('output').value
  const blob = new window.Blob([output], {
    type: 'application/json'
  })
  const url = window.URL.createObjectURL(blob)

  // download via a temporary <a> element
  const a = document.createElement('a')
  a.href = url
  a.download = 'aardvark.json'
  a.click()
}

function resetInput (e) {
  console.log('reset')
  document.location.reload()
}

function processInput () {
  // convert the input string to data
  const input = document.getElementById('input').value
  let j
  try {
    j = JSON.parse(input)
  } catch {
    // maybe the user is typing, and it's not valid JSON yet
    return
  }

  const count = (j.length > 1) ? j.length : 1

  // display number of records
  document.getElementById('count').innerHTML = count + ' record' + (count === 1 ? '' : 's') + " <button id='reset'>x</button>"
  document.getElementById('reset').addEventListener('click', resetInput)

  // convert each record from gbl 1.0 to aardvark
  if (count > 1) {
    for (let i = 0; i < j.length; i++) {
      j[i] = gbl2aardvark(j[i])
    }
  } else {
    j = gbl2aardvark(j)
  }

  // convert data back to a string
  let output = JSON.stringify(j, null, 2)

  // add blank lines between records, for readability
  output = output.replace(/},\n\s\s{/g, '},\n\n\n\n  {')

  document.getElementById('output').value = output
}

function gbl2aardvark (r) {
  // convert record r to aardvark

  function copyField (g, a) {
    // simple transfer of gbl property g to aardvark property a
    if (r[g] !== undefined) {
      r2[a] = r[g]
    }
  }

  function setResourceClass () {
    // GBL1 has dc_type_s: Dataset | Image | Collection | Interactive Resource | Collection | Physical Object
    // Aardvark has gbl_resourceClass_sm: Collections | Datasets | Imagery | Maps | Web services | Websites | Other
    // TODO: should these new values be singular instead?  Also, image vs imagery
    const crosswalk = {
      'dataset': 'Datasets',
      'image': 'Imagery',
      'collection': 'Collections',
      'interactive resource': 'Websites',
      'physical object': 'Other'
    }
    const v1 = r.dc_type_s
    let v2
    try {
      // use lowercase for case-insensitive matching
      v2 = crosswalk[v1.toLowerCase()]
    } catch { }
    if (v2 === undefined) {
      // because this is a required field
      v2 = 'EDIT ME -- this record had dc_type_s = ' + v1
    }
    r2.gbl_resourceClass_sm = v2
  }

  function setResourceType () {
    // GBL1 has layer_geom_type_s: Point | Line | Polygon | Image | Raster | Mixed | Table
    // Aardvark has gbl_resourceType_sm: 81 possible values, https://opengeometadata.org/docs/ogm-aardvark/resource-type
    const crosswalk = {
      'point': 'Point data',
      'line': 'Line data',
      'polygon': 'Polygon data',
      // 'image': '',
      'raster': 'Raster data',
      // 'mixed': '',
      'table': 'Table data'
    }
    const v1 = r.layer_geom_type_s
    let v2
    try {
      // use lowercase for case-insensitive matching
      v2 = crosswalk[v1.toLowerCase()]
    } catch { }
    if (v2 === undefined && v1 !== undefined) {
      v2 = 'EDIT ME -- this record had layer_geom_type_s = ' + v1
    }
    if (v2 !== undefined) {
      r2.gbl_resourceType_sm = v2
    }
  }

  function setTheme () {
    // Set themes, based on dc_subject_sm
    const keywords = {
      'agriculture': 'agricultur.*,farming,cultivation,irrigation,aquaculture,plantation.*,herding,crop.*,livestock',

      'biology': 'biolog.*,biota,flora,fauna,wildlife,vegetation,ecolog.*,wilderness,sealife,habitat,bird.*,mammal.*,fish.*,tree.*,flower.*',

      'boundaries': 'boundar.*,politicaladministrative,admin.*',

      'climate': 'climat.*,climatologymeteorologyatmosphere,atmospher.*,cloud cover,weather,precipitation,snow,ice,glacier.*,tornado.*',

      'economy': 'econom.*,employ.*,business.*,labou?r,sales?,revenue,commerc.*,industr.*,tourism,forestry,fisher.*',

      'elevation': 'elevation,altitude,dem,bathymetr.*,lidar,slope,topograph.*',

      'environment': 'environment.*,conservation,pollut.*,waste,natur.*,landscape',

      'events': 'events?,disasters?,concerts?,races?,protests?,crime,arrests?,accidents?,cases?',

      'geology': 'geolog.*,geoscientificInformation,earth science,geophysic.*,minerals?,rocks?,earthquakes?,volcane*,landslides?,gravit.*,soils?,permafrost,erosion',

      'health': 'health,human ecology,safety,diseases?,illness.*,hygiene,substance abuse,hospitals?,doctors?',

      'imagery': 'image.*,aerial,photo.*,oblique,.*views?',

      'inland waters': 'waters?,inlandWaters,drainages?,rivers?,streams?,glaciers?,lakes?,dams?,floods?,hydrograph.*',

      'land cover': 'land cover,landcover,forests?,wetlands?,impervious.*,canop.*',

      'location': 'location.*,position.*,address.*,geodetic,control points?,postal,place names?,placenames?,gazetteers?,zip\\s?codes?',

      'military': 'militar.*,intelligenceMilitary,barracks',

      'oceans': 'ocean.*,tides?,tidal,waves?,coast.*,reefs?',

      'property': 'propert.*,planningCadastre,land use,zoning,cadastr.*,land ownership',

      'society': 'society,cultures?,settlements?,anthropology,archaeology,education.*,tradition.*,manners,customs,demograph.*,recreation.*,social,crimes?,justice,census.*,sociolog.*,parks',

      'structure': 'structur.*,man-made,construction.*,buildings?,museums?,church.*,factor(y|ies),hous(e|ing),monuments?,shop.*,towers?,parking',

      'transportation': 'transport.*,roads?,streets?,airports?,airstrips?,shipping,tunnels?,nautical,vehic.*,vessels?,aeronaut.*,rail.*,transit,bus,buses,subways?',

      'utilities': 'utilit.*,utilitiesCommunication,energy,communicat.*,sewers?,broadband,phones?,telephon.*,internet'
    }
    const subjects = r.dc_subject_sm
    const themes = []
    if (subjects && subjects.length > 0) {
      for (let si = 0; si < subjects.length; si++) {
        const subject = subjects[si].toLowerCase()
        for (const [k, v] of Object.entries(keywords)) {
          const re = new RegExp('\\b(' + v.replace(/,/g, '|') + ')\\b')
          if (re.test(subject) && themes.indexOf(k) === -1) {
            themes.push(k)
          }
        }
      }
    }
    if (themes.length > 0) {
      r2.dcat_theme_sm = themes
    }
  }

  const r2 = {}
  copyField('dc_title_s', 'dct_title_s')
  // copyField('', 'dct_alternative_sm') // new field -- no existing records would have this?
  copyField('dc_description_s', 'dct_description_sm')
  copyField('dc_language_s or _sm', 'dct_language_sm')
  copyField('dc_creator_sm', 'dct_creator_sm')
  copyField('dc_publisher_s', 'dct_publisher_sm')
  copyField('dct_provenance_s', 'schema_provider_s')
  setResourceClass()
  setResourceType()
  copyField('dc_subject_sm', 'dct_subject_sm')
  setTheme()
  copyField('', 'dcat_keyword_sm')
  copyField('dct_temporal_sm', 'dct_temporal_sm')
  copyField('dct_issued_s', 'dct_issued_s')
  copyField('solr_year_i', 'gbl_indexYear_im')
  copyField('', 'gbl_dateRange_drsim')
  copyField('dct_spatial_sm', 'dct_spatial_sm')
  copyField('solr_geom', 'locn_geometry')
  copyField('solr_geom', 'dcat_bbox')
  copyField('', 'dcat_centroid')
  copyField('', 'dct_relation_sm')
  copyField('', 'pcdm_memberOf_sm')
  copyField('', 'dct_isPartOf_sm')
  copyField('dc_source_sm', 'dct_source_sm')
  copyField('', 'dct_isVersionOf_sm')
  copyField('', 'dct_replaces_sm')
  copyField('', 'dct_isReplacedBy_sm')
  copyField('', 'dct_rights_sm')
  copyField('', 'dct_rightsHolder_sm')
  copyField('', 'dct_license_sm')
  copyField('dc_rights_s', 'dct_accessRights_s')
  copyField('dc_format_s', 'dct_format_s')
  copyField('', 'gbl_fileSize_s')
  copyField('layer_id_s', 'gbl_wxsIdentifier_s')
  copyField('dct_references_s', 'dct_references_s')
  copyField('layer_slug_s', 'id')
  copyField('dc_identifier_s', 'dct_identifier_sm')
  copyField('layer_modified_dt', 'gbl_mdModified_dt')
  r2['gbl_mdVersion_s'] = 'OGM Aardvark'
  copyField('suppressed_b', 'gbl_suppressed_b')
  copyField('', 'gbl_georeferenced_b')

  // any properties that can have multivalues
  // (with 'm' after the final underscore, like dct_language_sm)
  // should always have array values
  for (const p in r2) {
    const v = r2[p]
    const suffix = p.split('_').slice(-1)[0]
    if (suffix === 'sm' && !Array.isArray(v)) {
      r2[p] = [v]
    }
  }
  return r2
}
