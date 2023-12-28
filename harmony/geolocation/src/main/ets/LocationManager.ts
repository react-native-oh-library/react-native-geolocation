/**
 * MIT License
 *
 * Copyright (C) 2023 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANT KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import geoLocationManager from '@ohos.geoLocationManager';
import { BusinessError } from '@ohos.base';
import logger from './Logger';
import systemDateTime from '@ohos.systemDateTime';

const TAG: string = "LocationManager"

const locationChangeListener = (location: geoLocationManager.Location) => {
  logger.debug(TAG, `locationChangeListener: data:${JSON.stringify(location)}`);
}

let rnIns_global = null

export class LocationManager {

  rnIns:any

  setRnInstance(rnInstance){
    this.rnIns = rnInstance
    rnIns_global = this.rnIns
  }
  /**
   * @param options
   * @param success
   * @param error
   */
  getCurrentLocationData(options, success, error): void {
    logger.debug(TAG, "getCurrentLocationData enter");

    let locationChange = (err: BusinessError, location: geoLocationManager.Location): void => {
      if (err) {
        logger.error(TAG, "getCurrentLocationData,locationChanger: err=" + JSON.stringify(err));
        error(err)
      }
      if (location) {
        logger.debug(TAG, "getCurrentLocationData,locationChanger,location=" + JSON.stringify(location));
        let position = {
          coords: {
            latitude: location.latitude,
            longitude: location.longitude,
            altitude: location.altitude,
            accuracy: location.accuracy,
            heading: location.direction,
            speed: location.speed,
          },
          timeStamp: location.timeStamp,
        }
        logger.debug(TAG, `getCurrentLocationData,locationChanger,before call success,position=${JSON.stringify(position)}`);
        success(position)
      }
    };

    let requestInfo: geoLocationManager.CurrentLocationRequest = {
      'priority': geoLocationManager.LocationRequestPriority.FIRST_FIX,
      'scenario': geoLocationManager.LocationRequestScenario.UNSET,
      'maxAccuracy': 0,
      'timeoutMs': 2000 };
    if (options) {
      if (options.timeout) {
        requestInfo.timeoutMs = options.timeout
      }
      if (options.enableHighAccuracy) {
        requestInfo.maxAccuracy = 0
      }
    }

    if (options.maximumAge) {
      let lastLoc: geoLocationManager.Location = geoLocationManager.getLastLocation() // 上一次位置
      let now = new Date().getTime()
      logger.debug(TAG, `,getCurrentLocation,now:${now}`);
      logger.debug(TAG, `,getCurrentLocation,lastLoc.timeStamp:${lastLoc.timeStamp}`);
      if ((now - lastLoc.timeStamp) <= options.maximumAge) {
        logger.debug(TAG, ",getCurrentLocation,return lastLoc");
        locationChange(undefined, lastLoc);
        return;
      }
    }
    logger.debug(TAG, ",getCurrentLocation,before call geoLocationManager.getCurrentLocation");
    geoLocationManager.getCurrentLocation(requestInfo, locationChange)
  }

  startObserving(requestInfo): void {
    logger.debug(TAG, ",startObserving enter");
    try {
      logger.debug(TAG, ",startObserving,on second");
      geoLocationManager.on('locationChange', requestInfo, (location)=>{
        let position = {
          coords: {
            latitude: location.latitude,
            longitude: location.longitude,
            altitude: location.altitude,
            accuracy: location.accuracy,
            heading: location.direction,
            speed: location.speed,
          },
          timeStamp: location.timeStamp,
        }
		logger.debug(TAG, `startObserving,emitDeviceEvent position:${position}`)
        rnIns_global.emitDeviceEvent("geolocationDidChange",position)
      });
    } catch (error) {
      let err: BusinessError = error as BusinessError;
	  if(err.code !== undefined){
		rnIns_global.emitDeviceEvent("geolocationError",{code: err.code, message: err.message})
	  }
      logger.error(TAG, `startObserving,startObserving errCode:${err.code},errMessage:${err.message}`);
    }
  }

  stopObserving(): void {
    logger.debug(TAG, ",stopObserving enter");
    try {
      geoLocationManager.off('locationChange', locationChangeListener);
    } catch (error) {
      let err: BusinessError = error as BusinessError;
      logger.error(TAG, `,stopObserving,errCode:${err.code},errMessage:${err.message}`);
    }
  }
}