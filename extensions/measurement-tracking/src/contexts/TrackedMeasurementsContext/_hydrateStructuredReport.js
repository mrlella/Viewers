import * as cornerstone3D from '@cornerstonejs/core';
import OHIF, { DicomMetadataStore } from '@ohif/core';
import getLabelFromDCMJSImportedToolData from './utils/getLabelFromDCMJSImportedToolData';
import getCornerstoneToolStateToMeasurementSchema from './getCornerstoneToolStateToMeasurementSchema';
import { adapters } from 'dcmjs';

const { guid } = OHIF.utils;
const { MeasurementReport } = adapters.Cornerstone3D;

/**
 *
 */
export default function _hydrateStructuredReport(
  { servicesManager, extensionManager },
  displaySetInstanceUID
) {
  const dataSource = extensionManager.getActiveDataSource()[0];
  const { MeasurementService, DisplaySetService } = servicesManager.services;

  const displaySet = DisplaySetService.getDisplaySetByUID(
    displaySetInstanceUID
  );

  // TODO -> We should define a strict versioning somewhere.
  const mappings = MeasurementService.getSourceMappings(
    'CornerstoneTools3D',
    '1'
  );

  if (!mappings || !mappings.length) {
    throw new Error(
      `Attempting to hydrate measurements service when no mappings present. This shouldn't be reached.`
    );
  }

  const instance = DicomMetadataStore.getInstance(
    displaySet.StudyInstanceUID,
    displaySet.SeriesInstanceUID,
    displaySet.SOPInstanceUID
  );

  const sopInstanceUIDToImageId = {};

  displaySet.measurements.forEach(measurement => {
    const { ReferencedSOPInstanceUID, imageId } = measurement;
    if (!sopInstanceUIDToImageId[ReferencedSOPInstanceUID]) {
      sopInstanceUIDToImageId[ReferencedSOPInstanceUID] = imageId;
    }
  });

  // Use dcmjs to generate toolState.
  const storedMeasurementByAnnotationType = MeasurementReport.generateToolState(
    instance,
    // NOTE: we need to pass in the imageIds to dcmjs since the we use them
    // for the imageToWorld transformation. The following assumes that the order
    // that measurements were added to the display set are the same order as
    // the measurementGroups in the instance.
    Object.values(sopInstanceUIDToImageId),
    cornerstone3D.utilities.imageToWorldCoords
  );

  // Filter what is found by DICOM SR to measurements we support.
  const mappingDefinitions = mappings.map(m => m.annotationType);
  const hydratableMeasurementsInSR = {};

  Object.keys(storedMeasurementByAnnotationType).forEach(key => {
    if (mappingDefinitions.includes(key)) {
      hydratableMeasurementsInSR[key] = storedMeasurementByAnnotationType[key];
    }
  });

  // Set the series touched as tracked.
  const imageIds = [];

  // TODO: notification if no hydratable?
  Object.keys(hydratableMeasurementsInSR).forEach(annotationType => {
    const toolDataForAnnotationType =
      hydratableMeasurementsInSR[annotationType];

    toolDataForAnnotationType.forEach(toolData => {
      // Add the measurement to toolState
      const imageId = sopInstanceUIDToImageId[toolData.sopInstanceUid];

      if (!imageIds.includes(imageId)) {
        imageIds.push(imageId);
      }
    });
  });

  let targetStudyInstanceUID;
  const SeriesInstanceUIDs = [];

  for (let i = 0; i < imageIds.length; i++) {
    const imageId = imageIds[i];
    const { SeriesInstanceUID, StudyInstanceUID } = cornerstone3D.metaData.get(
      'instance',
      imageId
    );

    if (!SeriesInstanceUIDs.includes(SeriesInstanceUID)) {
      SeriesInstanceUIDs.push(SeriesInstanceUID);
    }

    if (!targetStudyInstanceUID) {
      targetStudyInstanceUID = StudyInstanceUID;
    } else if (targetStudyInstanceUID !== StudyInstanceUID) {
      console.warn(
        'NO SUPPORT FOR SRs THAT HAVE MEASUREMENTS FROM MULTIPLE STUDIES.'
      );
    }
  }

  Object.keys(hydratableMeasurementsInSR).forEach(annotationType => {
    const toolDataForAnnotationType =
      hydratableMeasurementsInSR[annotationType];

    toolDataForAnnotationType.forEach(toolData => {
      // Add the measurement to toolState
      const imageId = sopInstanceUIDToImageId[toolData.sopInstanceUid];

      toolData.uid = guid();

      const instance = cornerstone3D.metaData.get('instance', imageId);
      const {
        SOPInstanceUID,
        FrameOfReferenceUID,
        SeriesInstanceUID,
        StudyInstanceUID,
      } = instance;

      // Let the measurement service know we added to toolState
      const toMeasurementSchema = getCornerstoneToolStateToMeasurementSchema(
        annotationType,
        MeasurementService,
        DisplaySetService,
        SOPInstanceUID,
        FrameOfReferenceUID,
        SeriesInstanceUID,
        StudyInstanceUID
      );

      const source = MeasurementService.getSource('CornerstoneTools3D', '1');

      toolData.label = getLabelFromDCMJSImportedToolData(toolData);

      MeasurementService.addRawMeasurement(
        source,
        annotationType,
        toolData,
        toMeasurementSchema,
        dataSource
      );

      if (!imageIds.includes(imageId)) {
        imageIds.push(imageId);
      }
    });
  });

  displaySet.isHydrated = true;

  return {
    StudyInstanceUID: targetStudyInstanceUID,
    SeriesInstanceUIDs,
  };
}
