# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file LICENSE.rst or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION ${CMAKE_VERSION}) # this file comes with cmake

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/src/libusb")
  file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/src/libusb")
endif()
file(MAKE_DIRECTORY
  "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/src/libusb-build"
  "/Users/harshkumar/Desktop/sdrangel/build/external/libusb"
  "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/tmp"
  "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/src/libusb-stamp"
  "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/src"
  "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/src/libusb-stamp"
)

set(configSubDirs )
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/src/libusb-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "/Users/harshkumar/Desktop/sdrangel/build/external/libusb/src/libusb-stamp${cfgdir}") # cfgdir has leading slash
endif()
