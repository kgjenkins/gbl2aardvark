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
      try {
        // parse as json
        let j = JSON.parse(e.target.result)

        // if a full solr response, only use the response/docs
        if (j.response && j.response.docs) {
          j = j.response.docs
        }

        // pretty-print
        const pp = JSON.stringify(j, null, 2)
        inputs.push(pp)
        readFile(i + 1)
      } catch {
        console.log('Error parsing JSON from file: ' + file.name)
      }
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

  // add blank line between records, for readability
  output = output.replace(/},\n\s\s{/g, '},\n\n  {')

  document.getElementById('output').value = output
}

function gbl2aardvark (r) {
  // convert record r to aardvark

  function x(g, a) {
    // simple transfer of gbl property g to aardvark property a
    if (r[g] !== undefined) {
      r2[a] = r[g]
    }
  }

  const r2 = {}
  x('dc_title_s', 'dct_title_s')
  x('', 'dct_alternative_sm')
  x('dc_description_s', 'dct_description_sm')
  x('dc_language_s or _sm', 'dct_language_sm')
  x('dc_creator_sm', 'dct_creator_sm')
  x('dc_publisher_s', 'dct_publisher_sm')
  x('dct_provenance_s', 'schema_provider_s')
  x('', 'gbl_resourceClass_sm')
  x('', 'gbl_resourceType_sm')
  x('dc_subject_sm', 'dct_subject_sm')
  x('', 'dcat_theme_sm')
  x('', 'dcat_keyword_sm')
  x('dct_temporal_sm', 'dct_temporal_sm')
  x('dct_issued_s', 'dct_issued_s')
  x('solr_year_i', 'gbl_indexYear_im')
  x('', 'gbl_dateRange_drsim')
  x('dct_spatial_sm', 'dct_spatial_sm')
  x('solr_geom', 'locn_geometry')
  x('solr_geom', 'dcat_bbox')
  x('', 'dcat_centroid')
  x('', 'dct_relation_sm')
  x('', 'pcdm_memberOf_sm')
  x('', 'dct_isPartOf_sm')
  x('dc_source_sm', 'dct_source_sm')
  x('', 'dct_isVersionOf_sm')
  x('', 'dct_replaces_sm')
  x('', 'dct_isReplacedBy_sm')
  x('', 'dct_rights_sm')
  x('', 'dct_rightsHolder_sm')
  x('', 'dct_license_sm')
  x('dc_rights_s', 'dct_accessRights_s')
  x('dc_format_s', 'dct_format_s')
  x('', 'gbl_fileSize_s')
  x('layer_id_s', 'gbl_wxsIdentifier_s')
  x('dct_references_s', 'dct_references_s')
  x('layer_slug_s', 'id')
  x('dc_identifier_s', 'dct_identifier_sm')
  x('layer_modified_dt', 'gbl_mdModified_dt')
  r2['gbl_mdVersion_s'] = 'Aardvark'
  x('suppressed_b', 'gbl_suppressed_b')
  x('', 'gbl_georeferenced_b')

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
